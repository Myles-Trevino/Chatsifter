/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import Browser from 'webextension-polyfill';

import * as Types from './types';
import * as Constants from './constants';


const extensionPorts: Map<string, Browser.Runtime.Port> = new Map();
let currentTabTitle = Constants.defaultTabTitle;


// Listen for active tab switches.
Browser.tabs.onActivated.addListener(
	(activeInfo) => { updateCallback(activeInfo.tabId); });


// Listen for URL changes.
Browser.tabs.onUpdated.addListener((tabId, changeInfo) =>
{ if(changeInfo.status === 'complete') updateCallback(tabId); });


// Listen for tab closes.
Browser.tabs.onRemoved.addListener((tabId) =>
{
	// Notify the extension instance bound to the closed tab that it has been orphaned.
	sendExtensionMessage(tabId, {type: 'Orphaned'});
});


// Update (tab or URL change) callback.
// The content script cannot be injected via the manifest because YouTube
// is a single page application and thus URL changes are not registered normally.
async function updateCallback(tabId?: number): Promise<void>
{
	if(tabId === undefined) throw new Error('Tab ID not provided.');

	// Update the title of the extension instance bound to the tab.
	const currentTab = await Browser.tabs.get(tabId);
	currentTabTitle = currentTab.title ?? Constants.defaultTabTitle;
	sendExtensionMessage(tabId, {type: 'Title', data: currentTabTitle});

	// Otherwise, inject the content script.
	console.log('Tab update:', tabId, '. Title: ', currentTabTitle);

	// Set the extension instance bound to this tab to
	// inactive if this is not a YouTube video URL.
	const url = (await Browser.tabs.get(tabId)).url;
	if(!url || !url.includes(Constants.youtubeVideoUrlQuery)) return;

	// Otherwise, inject the content script.
	console.log('Injecting into tab ID:', tabId, '. Title: ', currentTabTitle);

	await Browser.tabs.executeScript(tabId, {file: 'content.js'});
	await Browser.tabs.executeScript(tabId, {file: 'runtime.js'});
}


// Listen for connection requests.
Browser.runtime.onConnect.addListener((port) =>
{
	// Get the message's tab ID.
	const messageTabId = port.sender?.tab?.id;
	if(messageTabId === undefined) throw new Error('Could not get the tab ID.');

	// If this is a content script connection request...
	if(port.name === Constants.contentPortName)
	{
		console.log('Connected:', port.name);

		// Forward messages to the corresponding extension port.
		port.onMessage.addListener((message: Types.IpcMessage) =>
		{
			// console.log('Message from tab ID:', messageTabId);
			sendExtensionMessage(messageTabId, message);

			extensionPorts.get(Constants.extensionPortNameBase+
				messageTabId.toString())?.postMessage(message);
		});

		// Remove the port and orphan the bound extension instance on disconnect.
		port.onDisconnect.addListener(() =>
		{ console.log('Disconnected:', port.name); });
	}

	// If this is an extension connection request...
	else if(port.name.includes(Constants.extensionPortNameBase))
	{
		// Save the port.
		extensionPorts.set(port.name, port);
		console.log('Connected:', port.name);

		// Remove the port on disconnect.
		port.onDisconnect.addListener(() =>
		{
			extensionPorts.delete(port.name);
			console.log('Disconnected:', port.name);
		});
	}
});


// Extension icon click callback.
Browser.browserAction.onClicked.addListener((tab) => { extensionClickCallback(tab); });

async function extensionClickCallback(tab: Browser.Tabs.Tab): Promise<void>
{
	if(tab.id === undefined || tab.title === undefined)
		throw new Error('Could not get the tab ID.');

	// Create an extension instance.
	await Browser.windows.create
	({
		url: `index.html?${Constants.boundTabIdQueryParamKey}=${tab.id.toString()}`+
			`&${Constants.boundTabTitleQueryParamKey}=${tab.title}`,
		type: 'popup',
		width: 400,
		height: 700
	});
}


// Sends the given message to the extension instance bound to the given tab ID.
function sendExtensionMessage(tabId: number, message: Types.IpcMessage): void
{
	extensionPorts.get(Constants.extensionPortNameBase+
		tabId.toString())?.postMessage(message);
}
