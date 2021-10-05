/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

import Browser from 'webextension-polyfill';
import Hash from 'object-hash';

import * as Constants from '../constants';
import * as Types from '../types';


@Injectable({providedIn: 'root'})

export class StateService
{
	public updateSubject: Subject<void> = new Subject();
	public pageSubject: Subject<Types.Page> = new Subject();
	public boundTabTitleSubject: Subject<string> = new Subject();
	public page = Types.defaultPage;
	public savedState: Types.SavedState = Types.defaultSavedState;

	private readonly chatMessages: Map<number, Types.ChatMessage> = new Map();
	private readonly chatMessageHashes: Set<string> = new Set();
	private index = 0;
	private generalChatMessageIndicies: number[] = [];
	private superchatMessageIndicies: number[] = [];
	private moderatorChatMessageIndicies: number[] = [];
	private foreignChatMessageIndicies: number[] = [];
	private customChatMessageIndicies: number[] = [];


	// Initializer.
	public initialize(boundTabId: number, boundTabTitle: string): void
	{
		console.log('Bound to tab:', boundTabId, boundTabTitle);
		this.boundTabTitleSubject.next(boundTabTitle);

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
				case 'Title': this.boundTabTitleSubject.next(message.data as string); break;
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
		this.index = 0;
		this.generalChatMessageIndicies = [];
		this.superchatMessageIndicies = [];
		this.moderatorChatMessageIndicies = [];
		this.foreignChatMessageIndicies = [];
		this.customChatMessageIndicies = [];

		this.updateSubject.next();
	}


	// Adds the given chat message.
	private addChatMessage(chatMessage: Types.ChatMessage): void
	{
		// Return if the chat message is a duplicate.
		const hash = Hash(chatMessage);
		if(this.chatMessageHashes.has(hash)) return;
		this.chatMessageHashes.add(hash);

		// Otherwise, add the chat message.
		chatMessage.index = this.index;
		this.chatMessages.set(this.index, chatMessage);

		// Add the chat message index to the appropriate arrays.
		this.addChatMessageIndex(this.generalChatMessageIndicies, true);
		if(this.page === 'General') this.updateSubject.next();

		if(chatMessage.type !== 'Default')
		{
			this.addChatMessageIndex(this.superchatMessageIndicies);
			if(this.page === 'Superchat') this.updateSubject.next();
		}

		if(chatMessage.isModerator)
		{
			this.addChatMessageIndex(this.moderatorChatMessageIndicies);
			if(this.page === 'Moderator') this.updateSubject.next();
		}

		if(chatMessage.isForeign)
		{
			this.addChatMessageIndex(this.foreignChatMessageIndicies, true);
			if(this.page === 'Foreign') this.updateSubject.next();
		}

		if(this.containsCustomQuery(chatMessage))
		{
			this.addChatMessageIndex(this.customChatMessageIndicies, true);
			if(this.page === 'Custom') this.updateSubject.next();
		}

		++this.index;
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


	// Gets the chat message indicies for the current page.
	private getChatMessageIndices(): number[]
	{
		switch(this.page)
		{
			case 'General': return this.generalChatMessageIndicies;
			case 'Superchat': return this.superchatMessageIndicies;
			case 'Foreign': return this.foreignChatMessageIndicies;
			case 'Moderator': return this.moderatorChatMessageIndicies;
			case 'Custom': return this.customChatMessageIndicies;
			default: return [];
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
