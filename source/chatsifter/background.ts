/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import Browser from 'webextension-polyfill';

import * as Constants from './constants';


let extensionPort: Browser.Runtime.Port | undefined = undefined;
let contentPort: Browser.Runtime.Port | undefined = undefined;


// URL change callback.
Browser.tabs.onActivated.addListener((activeInfo) =>
{ urlUpdateCallback(activeInfo.tabId); });

Browser.tabs.onUpdated.addListener((tabId, changeInfo) =>
{ if(changeInfo.status === 'complete') urlUpdateCallback(tabId); });

async function urlUpdateCallback(tabId: number): Promise<void>
{
	// Return if this is not a YouTube video URL.
	const url = (await Browser.tabs.get(tabId)).url;
	if(!url || !url.includes('youtube.com/watch?v=')) return;

	// Otherwise, inject the content script.
	console.log('Injecting into:', url, tabId);
	contentPort?.postMessage(undefined);
	await Browser.tabs.executeScript(tabId, {file: 'content.js'});
	await Browser.tabs.executeScript(tabId, {file: 'runtime.js'});
}


// Open the popup when the extension icon is clicked.
Browser.browserAction.onClicked.addListener(() =>
{
	if(extensionPort) return;

	Browser.windows.create
	({
		url: 'index.html',
		type: 'popup',
		width: 400,
		height: 700
	});
});


// Listen for connection requests.
Browser.runtime.onConnect.addListener((port) =>
{
	// If this is a content script connection request,
	// Forward messages to the extension if the port is open.
	if(port.name === Constants.contentPortName)
	{
		contentPort = port;
		port.onDisconnect.addListener(() => { contentPort = undefined; });
		port.onMessage.addListener((message) => { extensionPort?.postMessage(message); });
	}

	// If this is an extension connection request, bind to the port.
	else if(port.name === Constants.extensionPortName)
	{
		extensionPort = port;
		port.onDisconnect.addListener(() => { extensionPort = undefined; });
	}
});
