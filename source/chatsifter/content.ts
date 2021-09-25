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
let chatContentsMutationObserver: MutationObserver | undefined = undefined;


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
		setTimeout(() => { reinitialize(true); }, 1000);
	});

	// Initialize if the document is already done loading.
	if(document.readyState === 'complete') initialize(true);

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
function reinitialize(reset = false): void
{
	initializationAttempts = 1;
	initialize(reset);
}


// Initializer.
function initialize(reset = false): void
{
	if(initializing) return;
	initializing = true;

	// Iframe querying can be unpredictable, so reattempt on failure.
	console.log(`Chatsifter: Initialization attempt ${initializationAttempts}.`);

	let chatContentsElement: Element | null = null;

	try
	{
		// Get the YouTube chat iframe element.
		const chatIframeElement =
			document.getElementById('chatframe') as HTMLIFrameElement | null;

		if(!chatIframeElement) throw new Error('Could not get the chat element.');

		// Get the iframe document.
		const chatIframeDocument = chatIframeElement.contentWindow?.document;
		if(!chatIframeDocument) throw new Error('Could not get the chat iframe document.');

		// Get the chat contents element.
		chatContentsElement = chatIframeDocument.querySelector('#chat-messages #contents');

		if(!chatContentsElement)
			throw new Error('Could not get the chat contents element.');
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
			initialize(reset);
		}, 1000);

		return;
	}

	// Send the reset message.
	if(reset) contentPort?.postMessage(undefined);

	// Parse the initial chat messages.
	const existingChatMessageElements =
		chatContentsElement.querySelectorAll('#items > *');

	for(const chatMessageElement of existingChatMessageElements)
		parseChatMessage(chatMessageElement as HTMLElement);

	// Observe changes to the chat items element.
	if(chatContentsMutationObserver) chatContentsMutationObserver.disconnect();
	chatContentsMutationObserver = new MutationObserver(chatContentsMutationCallback);

	chatContentsMutationObserver.observe(
		chatContentsElement, {childList: true, subtree: true});

	console.log('Chatsifter: Successfully initialized.');
	initializing = false;
}


// Called when the chat items element has mutated.
function chatContentsMutationCallback(mutationsList: MutationRecord[]): void
{
	// For each mutation...
	for(const mutation of mutationsList)
	{
		// Only handle node additions (new chat messages).
		if(mutation.type !== 'childList') continue;
		const newNodes = mutation.addedNodes;
		if(!newNodes.length) continue;

		// Parse each new chat message.
		for(const node of newNodes)
			if(node.nodeType === Node.ELEMENT_NODE)
				parseChatMessage(node as HTMLElement);
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
			default: return;
		}

		// If it is a superchat...
		let superchatColor = 'rgba(0, 0, 0, 0)';
		let superchatAmount = '$0';

		if(type === 'Superchat')
		{
			// Get the superchat color.
			const style = htmlElement.getAttribute('style');
			if(!style) throw new Error('Could not get a superchat\'s color.');

			let startIndex = style.indexOf(Constants.superchatColorPrefix);
			startIndex += Constants.superchatColorPrefix.length;
			const endIndex = style.indexOf(';', startIndex);
			superchatColor = style.slice(startIndex, endIndex);

			// Get the superchat amount.
			const amount = htmlElement.querySelector('#purchase-amount')?.textContent;
			if(!amount) throw new Error('Could not get a superchat\'s amount.');
			superchatAmount = amount;
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
		if(!messageNodes) throw new Error('Could not get a chat message\'s text.');

		const tokens: Types.ChatToken[] = [];
		let text = '';

		for(const messageNode of messageNodes)
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
			superchatColor, authorPhoto, timestamp, authorName, superchatAmount,
			membershipDuration, isVerified, isMember, memberBadge, isModerator, isOwner,
			tokens, translationStatus: 'Untranslated', showTranslation: false, isForeign};

		if(!contentPort) throw new Error('The content port has not been initialized.');
		contentPort.postMessage(chatMessage);
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
