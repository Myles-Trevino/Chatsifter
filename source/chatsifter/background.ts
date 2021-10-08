/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import Browser from 'webextension-polyfill';

import * as Types from './types';
import * as Constants from './constants';


const extensionPorts: Map<string, Browser.Runtime.Port> = new Map();
const contentPorts: Map<number, Browser.Runtime.Port> = new Map();
let currentTabTitle = Constants.defaultTabTitle;


// Listen for active tab switches.
Browser.tabs.onActivated.addListener((activeInfo) => { urlCallback(activeInfo.tabId); });


// Listen for tab updates.
// Title changes are delayed on navigation to new pages, but do not trigger on history
// navigation, so title must be checked for both on URL changes and separately.
Browser.tabs.onUpdated.addListener((tabId, changeInfo) =>
{
	if(changeInfo.status === 'complete') urlCallback(tabId);
	if(changeInfo.title) titleCallback(tabId, changeInfo.title);
});


// Listen for tab closes.
Browser.tabs.onRemoved.addListener((tabId) =>
{
	// Notify the extension instance bound to the closed tab that it has been orphaned.
	sendExtensionMessage(tabId, {type: 'Orphaned'});
	console.log('Tab closed: ', tabId);
});


// URL change callback.
async function urlCallback(tabId?: number): Promise<void>
{
	if(tabId === undefined) throw new Error('Tab ID not provided.');

	// Get the tab's title.
	const tab = await Browser.tabs.get(tabId);
	titleCallback(tabId, tab.title ?? Constants.defaultTabTitle);

	// Return if this is not a YouTube video URL.
	const url = tab.url;
	console.log('URL update:', tabId, url);
	if(!url || !url.includes(Constants.youtubeVideoUrlQuery)) return;

	// Otherwise, inject the content script.
	console.log('Injecting into tab ID:', tabId, '. Title: ', currentTabTitle);
	contentPorts.get(tabId)?.postMessage('Reinject');

	await Browser.tabs.executeScript(tabId, {file: 'content.js'});
	await Browser.tabs.executeScript(tabId, {file: 'runtime.js'});
}


// Title change callback.
function titleCallback(tabId: number, title: string): void
{
	currentTabTitle = title;
	console.log('Title change: ', tabId, currentTabTitle);
	sendExtensionMessage(tabId, {type: 'Title', data: currentTabTitle});
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
		// Save the port.
		contentPorts.set(messageTabId, port);
		console.log('Connected:', port.name, messageTabId);

		// Forward messages to the corresponding extension port.
		port.onMessage.addListener((message: Types.IpcMessage) =>
		{ sendExtensionMessage(messageTabId, message); });

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
	console.log('New extension instance:', tab.id, tab.title);

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
