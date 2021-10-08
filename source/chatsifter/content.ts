/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import Browser from 'webextension-polyfill';

import * as Types from './types';
import * as Constants from './constants';


let contentPort: Browser.Runtime.Port | undefined = undefined;
let initializing = false;
let initializationAttempts = 1;
let iframeDocumentMutationObserver: MutationObserver | undefined = undefined;


// Inject the content script.
inject();

function inject(): void
{
	// Do not inject if already injected.
	const injectionTag = 'chatsifter-injected';
	if(document.querySelector(injectionTag))
	{
		console.log('Chatsifter: Already injected.');
		return;
	}

	document.body.appendChild(document.createElement(injectionTag));
	console.log('Chatsifter: Content script injected.');


	// Establish a message connection to the background script.
	contentPort = Browser.runtime.connect({name: Constants.contentPortName});

	// On reinjection attempts, reinitialize after a delay.
	contentPort.onMessage.addListener(() =>
	{
		console.log('Reinitializing due to reinjection.');
		setTimeout(() => { reinitialize(); }, 1000);
	});

	// Initialize if the document is already done loading.
	if(document.readyState === 'complete') initialize();

	// Observe changes to the top-level document.
	const documentMutationObserver = new MutationObserver(documentMutationCallback);
	documentMutationObserver.observe(document, {childList: true, subtree: true});
}


// Called on changes to the top-level document.
function documentMutationCallback(mutationsList: MutationRecord[]): void
{
	// For each mutation, if the chat frame element
	// was added, (re)initialize after a delay.
	for(const mutation of mutationsList)
		for(const node of mutation.addedNodes)
		{
			if(node.nodeType !== Node.ELEMENT_NODE) continue;
			const element = (node as HTMLElement);
			if(element.tagName.toLowerCase() !== Constants.chatFrameTag) continue;
			reinitialize();
		}
}


// Resets the state and initializes.
function reinitialize(): void
{
	initializationAttempts = 1;
	initialize();
}


// Initializer.
function initialize(): void
{
	if(initializing) return;
	initializing = true;

	// Iframe querying can be unpredictable, so reattempt on failure.
	console.log(`Chatsifter: Initialization attempt ${initializationAttempts}.`);
	let chatIframeDocument: Document | undefined = undefined;

	try
	{
		// Get the YouTube chat iframe element.
		const chatIframeElement =
			document.getElementById('chatframe') as HTMLIFrameElement | null;

		if(!chatIframeElement) throw new Error('Could not get the chat iframe.');

		// Get the iframe document.
		chatIframeDocument = chatIframeElement.contentWindow?.document;
		if(!chatIframeDocument) throw new Error('Could not get the chat iframe document.');

		// Parse the initial chat messages, requiring at least one.
		const existingChatMessageElements =
		chatIframeDocument.querySelectorAll('#chat #items > *');

		if(existingChatMessageElements.length < 1)
			throw new Error('Could not find any existing chat messages.');

		for(const chatMessageElement of existingChatMessageElements)
			parseChatMessage(chatMessageElement as HTMLElement);
	}

	// Handle exceptions.
	catch(error: unknown)
	{
		// Limit the number of reattempts.
		++initializationAttempts;
		if(initializationAttempts > Constants.maximumInitializationAttempts)
		{
			initializing = false;
			throw new Error('Chatsifter: Too many initialization attempts.');
		}

		// Reattempt after a delay.
		console.error('Chatsifter:', error, 'Retrying in 1 second.');
		setTimeout(() =>
		{
			initializing = false;
			initialize();
		}, 1000);

		return;
	}

	// Observe changes to the chat items element.
	if(iframeDocumentMutationObserver) iframeDocumentMutationObserver.disconnect();
	iframeDocumentMutationObserver = new MutationObserver(chatContentsMutationCallback);

	iframeDocumentMutationObserver.observe(
		chatIframeDocument, {childList: true, subtree: true});

	console.log('Chatsifter: Successfully initialized.');
	initializing = false;
}


// Called when the chat items element has mutated.
function chatContentsMutationCallback(mutationsList: MutationRecord[]): void
{
	// For each mutation...
	for(const mutation of mutationsList)
	{
		if(mutation.type !== 'childList') continue;

		// Parse each new chat message.
		// Delay to attempt to let the stickers load.
		for(const node of mutation.addedNodes)
			if(node.nodeType === Node.ELEMENT_NODE)
				setTimeout(() => { parseChatMessage(node as HTMLElement); },
					Constants.updateDelay);
	}
}


// Parses the given HTML element as a chat message.
function parseChatMessage(htmlElement: HTMLElement): void
{
	try
	{
		// Make sure the element's tag is that of a default chat or superchat.
		let type = Types.defaultChatMessageType;

		switch(htmlElement.tagName.toLowerCase())
		{
			case Constants.defaultChatMessageTag: type = 'Default'; break;
			case Constants.membershipMessageTag: type = 'Membership'; break;
			case Constants.superchatMessageTag: type = 'Superchat'; break;
			case Constants.superchatStickerMessageTag: type = 'Sticker Superchat'; break;
			default: return;
		}

		// If it is a superchat...
		let superchatColor = 'rgba(0, 0, 0, 0)';
		let superchatAmount = '$0';

		if(type === 'Superchat' || type === 'Sticker Superchat')
		{
			// Get the superchat color.
			const style = htmlElement.getAttribute('style');
			if(!style) throw new Error('Could not get a superchat\'s color.');

			const prefix = '-color:';
			let startIndex = style.indexOf(prefix);
			if(startIndex === -1) throw new Error('Could not get a superchat\'s color.');
			startIndex += prefix.length;

			const endIndex = style.indexOf(';', startIndex);
			if(endIndex === -1) throw new Error('Could not get a superchat\'s color.');
			superchatColor = style.slice(startIndex, endIndex);

			// Get the superchat amount.
			const amount = htmlElement.querySelector(
				'#purchase-amount, #purchase-amount-chip')?.textContent;

			if(!amount) throw new Error('Could not get a superchat\'s amount.');
			superchatAmount = amount;
		}

		// If it is a sticker superchat, get the sticker.
		let stickerUrl: string | undefined = undefined;

		if(type === 'Sticker Superchat')
		{
			const stickerElement = htmlElement.querySelector('#sticker-container img');
			stickerUrl = (stickerElement as HTMLImageElement | null)?.src;
			if(!stickerUrl) throw new Error('Could not get a superchat\'s sticker.');

			// If the sticker has not loaded (a data URL
			// is used as a placeholder), delete the URL.
			if(stickerUrl.includes('base64')) stickerUrl = '';
		}

		// If it is a membership...
		let membershipDuration = '';

		if(type === 'Membership')
		{
			// Get the membership duration.
			const duration = htmlElement.querySelector('#header-primary-text')?.textContent;
			if(!duration) throw new Error('Could not get a membership\'s duration.');

			membershipDuration = duration.replace('Member for ', '')
				.replace(/(months)|(month)/, 'M');
		}

		// Timestamp.
		const timestamp = htmlElement.querySelector('#timestamp')?.textContent;
		if(!timestamp) throw new Error('Could not get a chat message\'s timestamp.');
		const time = Number.parseInt(timestamp.replaceAll(':', ''));

		// Author photo.
		const authorPhoto = htmlElement.querySelector('#author-photo img')
			?.getAttribute('src')?.replace('s32', 's64');

		if(!authorPhoto) throw new Error('Could not get a chat message\'s author photo.');

		// Author name.
		const authorNameElement = htmlElement.querySelector('#author-name');
		const authorName = authorNameElement?.textContent;
		if(!authorName) throw new Error('Could not get a chat message\'s author.');

		// Status.
		const isVerified = getBadge(htmlElement, 'verified') !== null;
		const memberBadge = getBadge(htmlElement, 'member') ?? '';
		const isMember = memberBadge !== '';
		const isModerator = getBadge(htmlElement, 'moderator') !== null;
		const isOwner = authorNameElement?.classList.contains('owner') ?? false;

		// Message tokens.
		const messageNodes = htmlElement.querySelector('#message')?.childNodes;
		const tokens: Types.ChatToken[] = [];
		let text = '';

		for(const messageNode of messageNodes ?? [])
		{
			// Text.
			if(messageNode.nodeType === Node.TEXT_NODE && messageNode.textContent)
			{
				const textContent = messageNode.textContent;
				tokens.push({type: 'Text', text: textContent});
				text += textContent;
			}

			// Images.
			else if(messageNode.nodeType === Node.ELEMENT_NODE)
			{
				const messageTokenElement = messageNode as HTMLElement;
				const url = messageTokenElement.getAttribute('src');
				if(!url) throw new Error('Could not get an image element\'s URL. ');
				tokens.push({type: 'Image', url});
			}
		}

		text = text.trim();

		// Detect whether the comment's language is foreign.
		const isForeign = containsJapanese(text);

		// Send an update message to the background script.
		const chatMessage: Types.ChatMessage = {index: 0, references: 0, type,
			superchatColor, authorPhoto, timestamp, time, authorName,
			superchatAmount, membershipDuration, isVerified, isMember, memberBadge,
			isModerator, isOwner, tokens, stickerUrl, translationStatus: 'Untranslated',
			showTranslation: false, isForeign};

		if(!contentPort) throw new Error('The content port has not been initialized.');

		const message: Types.IpcMessage = {type: 'Chat Message', data: chatMessage};
		contentPort.postMessage(message);
	}

	// Handle exceptions.
	catch(error: unknown){ console.error('Chatsifter:', error); }
}


// Returns the image URL of the badge of the given type if it exists.
function getBadge(chatMessageElement: HTMLElement, type: string): string | null
{
	const badgeElement = chatMessageElement.querySelector(
		`${Constants.badgeTag}[type="${type}"]`);
	if(!badgeElement) return null;

	const badgeImageElement = badgeElement.querySelector('img');
	const badge = badgeImageElement?.getAttribute('src');
	if(!badge) return '';

	return badge.replace('s16', 's32');
}


// Checks whether the given string contains common Japanese characters.
function containsJapanese(text: String): boolean
{
	for(const character of text)
		if(Constants.japaneseCharacters.has(character)) return true;

	return false;
}
