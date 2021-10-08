/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

import Browser from 'webextension-polyfill';

import * as Constants from '../constants';
import * as Types from '../types';


@Injectable({providedIn: 'root'})

export class StateService
{
	public updateSubject: Subject<void> = new Subject();
	public pageSubject: Subject<Types.Page> = new Subject();
	public boundTabTitleSubject: Subject<void> = new Subject();
	public page = Types.defaultPage;
	public savedState: Types.SavedState = Types.defaultSavedState;
	public boundTabTitle = '';

	private readonly chatMessages: Map<number, Types.ChatMessage> = new Map();
	private readonly chatMessageHashes: Set<string> = new Set();
	private readonly modifiedPages: Set<Types.Page> = new Set();
	private index = 0;
	private generalChatMessageIndicies: number[] = [];
	private superchatMessageIndicies: number[] = [];
	private moderatorChatMessageIndicies: number[] = [];
	private foreignChatMessageIndicies: number[] = [];
	private customChatMessageIndicies: number[] = [];
	private previousTime = Number.NEGATIVE_INFINITY;


	// Initializer.
	public initialize(boundTabId: number, boundTabTitle: string): void
	{
		this.setBoundTabTitle(boundTabTitle);
		console.log('Bound to tab:', boundTabId, boundTabTitle);

		// Load the saved state.
		const savedState = localStorage.getItem(Constants.savedStateKey);
		if(savedState) this.savedState = JSON.parse(savedState) as Types.SavedState;

		// Listen for state updates forwarded by the background
		// script from the content script of the bound tab.
		const portName = Constants.extensionPortNameBase+boundTabId.toString();
		const extensionPort = Browser.runtime.connect({name: portName});

		extensionPort.onMessage.addListener((message: Types.IpcMessage) =>
		{
			switch(message.type)
			{
				case 'Reset': this.reset(); break;
				case 'Orphaned': window.close(); break;
				case 'Title': this.setBoundTabTitle(message.data as string); break;
				case 'Chat Message': this.addChatMessage(message.data as Types.ChatMessage);
			}
		});
	}


	// Saves the state.
	public save(): void
	{
		localStorage.setItem(Constants.savedStateKey, JSON.stringify(this.savedState));
	}


	// Gets the chat messages for the current page.
	public getChatMessages(): Types.ChatMessage[]
	{
		const chatMessageIndicies = this.getChatMessageIndices();
		const chatMessages: Types.ChatMessage[] = [];

		for(const chatMessageIndex of chatMessageIndicies)
		{
			const chatMessage = this.chatMessages.get(chatMessageIndex);
			if(!chatMessage) throw new Error('Could not get a chat message by index.');
			chatMessages.push(chatMessage);
		}

		return chatMessages;
	}


	// Gets a chat message by index.
	private getChatMessage(chatMessageIndex: number): Types.ChatMessage
	{
		const chatMessage = this.chatMessages.get(chatMessageIndex);
		if(!chatMessage) throw new Error('Could not get a chat message by index.');
		return chatMessage;
	}


	// Resets the state.
	private reset(): void
	{
		this.chatMessages.clear();
		this.chatMessageHashes.clear();
		this.modifiedPages.clear();
		this.index = 0;
		this.generalChatMessageIndicies = [];
		this.superchatMessageIndicies = [];
		this.moderatorChatMessageIndicies = [];
		this.foreignChatMessageIndicies = [];
		this.customChatMessageIndicies = [];

		this.updateSubject.next();
	}


	// Sets the bound tab title.
	private setBoundTabTitle(boundTabTitle: string): void
	{
		// Reset the state on stream changes.
		if(this.boundTabTitle !== boundTabTitle) this.reset();
		this.boundTabTitle = boundTabTitle;

		// Update the title subject.
		this.boundTabTitleSubject.next();
	}


	// Adds the given chat message.
	private addChatMessage(chatMessage: Types.ChatMessage): void
	{
		// Check for time discrepancies.
		// Some special chats from before the seek time are replayed,
		// so only check for time discrepancies with default chats.
		if(chatMessage.type === 'Default' && chatMessage.time < this.previousTime)
		{
			// If there is a backwards seek, delete messages with
			// timestamps later than the seek position.
			for(const [futureChatMessageIndex, futureChatMessage] of this.chatMessages)
			{
				if(futureChatMessage.time <= chatMessage.time) continue;

				for(const pageType of this.getPageTypes(futureChatMessage))
				{
					this.modifiedPages.add(pageType);
					const indexArray = this.getChatMessageIndices(pageType);
					this.removeChatMessageIndex(indexArray, futureChatMessageIndex);
				}

				this.chatMessageHashes.delete(this.hashChatMessage(futureChatMessage));
				this.chatMessages.delete(futureChatMessageIndex);
			}
		}

		if(chatMessage.type === 'Default') this.previousTime = chatMessage.time;

		// Add the chat message if it is not a duplicate.
		const hash = this.hashChatMessage(chatMessage);

		if(!this.chatMessageHashes.has(hash))
		{
			this.chatMessageHashes.add(hash);

			// Otherwise, add the chat message.
			chatMessage.index = this.index;
			this.chatMessages.set(this.index, chatMessage);

			// For each page type of the chat message...
			for(const pageType of this.getPageTypes(chatMessage))
			{
				// Add the page type to the modified pages array.
				this.modifiedPages.add(pageType);

				// Add the chat message's index to the appropriate array.
				const limit = (pageType !== 'Superchat');
				this.addChatMessageIndex(this.getChatMessageIndices(pageType), limit);
			}

			// Increment the index.
			++this.index;
		}

		// Update if appropriate.
		if(this.modifiedPages.has(this.page)) this.updateSubject.next();
		this.modifiedPages.clear();
	}


	// Hashes the given chat message.
	private hashChatMessage(chatMessage: Types.ChatMessage): string
	{ return chatMessage.timestamp+chatMessage.authorName; }


	// Gets the page types of the chat message.
	private getPageTypes(chatMessage: Types.ChatMessage): Types.Page[]
	{
		const types: Types.Page[] = ['General'];
		if(chatMessage.type !== 'Default') types.push('Superchat');
		if(chatMessage.isModerator) types.push('Moderator');
		if(chatMessage.isForeign) types.push('Foreign');
		if(this.containsCustomQuery(chatMessage)) types.push('Custom');
		return types;
	}


	// Adds the chat message index to the given chat message index array, limiting
	// its size and removing chat messages with no references.
	private addChatMessageIndex(chatMessageIndexArray: number[], limit = false): void
	{
		// Increment the chat message's reference counter and
		// push the chat message index onto the given array.
		const chatMessage = this.getChatMessage(this.index);
		++chatMessage.references;
		chatMessageIndexArray.push(this.index);

		// If length limiting is enabled...
		if(!limit) return;

		// While the array is larger than the maximum allowed number of chat messages...
		while(chatMessageIndexArray.length > Constants.maximumChatMessages)
		{
			// Remove the oldest chat message's index.
			const removedChatMessageIndex = chatMessageIndexArray.shift();
			if(removedChatMessageIndex === undefined) continue;

			// Decrement the chat message's reference count.
			const removedChatMessage = this.getChatMessage(removedChatMessageIndex);
			--removedChatMessage.references;

			// If the chat message has no references, delete it.
			if(removedChatMessage.references < 1)
				this.chatMessages.delete(removedChatMessageIndex);
		}
	}


	// Removes the given index from the given array.
	private removeChatMessageIndex(chatMessageIndicies: number[],
		chatMessageIndex: number): void
	{
		const removalIndex = chatMessageIndicies.indexOf(chatMessageIndex);
		chatMessageIndicies.splice(removalIndex, 1);
	}


	// Gets the chat message indicies for the given page.
	private getChatMessageIndices(page = this.page): number[]
	{
		switch(page)
		{
			case 'General': return this.generalChatMessageIndicies;
			case 'Superchat': return this.superchatMessageIndicies;
			case 'Foreign': return this.foreignChatMessageIndicies;
			case 'Moderator': return this.moderatorChatMessageIndicies;
			case 'Custom': return this.customChatMessageIndicies;
			default: throw new Error('Invalid page type.');
		}
	}


	// Checks if the chat message contains the custom query.
	private containsCustomQuery(chatMessage: Types.ChatMessage): boolean
	{
		// Generate the regex.
		let regex: RegExp | undefined = undefined;

		if(this.savedState.regexCustomQuery)
		{
			try{ regex = new RegExp(this.savedState.customQuery); }
			catch(error: unknown){}
		}

		// For each token in the chat message...
		for(const token of chatMessage.tokens)
		{
			if(!token.text) continue;

			// Regex query.
			if(regex){ if(regex.test(token.text)) return true; }

			// Regular query.
			if(token.text.includes(this.savedState.customQuery)) return true;
		}

		return false;
	}
}
