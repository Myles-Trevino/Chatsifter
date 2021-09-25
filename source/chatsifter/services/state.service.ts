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
	public page = Types.defaultPage;
	public savedState: Types.SavedState = Types.defaultSavedState;

	private readonly chatMessages: Map<number, Types.ChatMessage> = new Map();
	private readonly chatMessageHashes: Set<string> = new Set();
	private index = 0;
	private generalChatMessageIndicies: number[] = [];
	private superchatMessageIndicies: number[] = [];
	private moderatorChatMessageIndicies: number[] = [];
	private foreignChatMessageIndicies: number[] = [];


	// Initializer.
	public initialize(): void
	{
		// Load the saved state.
		const savedState = localStorage.getItem(Constants.savedStateKey);
		if(savedState) this.savedState = JSON.parse(savedState) as Types.SavedState;

		// Listen for state updates.
		const contentPort = Browser.runtime.connect({name: Constants.extensionPortName});

		contentPort.onMessage.addListener((chatMessage: Types.ChatMessage | undefined) =>
		{
			// If this is a reset message (undefined was passed), clear the state.
			if(!chatMessage)
			{
				this.resetState();
				return;
			}

			// Return if the chat message is a duplicate.
			const hash = Hash(chatMessage);
			if(this.chatMessageHashes.has(hash)) return;
			this.chatMessageHashes.add(hash);

			// Otherwise, add the chat message.
			chatMessage.index = this.index;
			this.chatMessages.set(this.index, chatMessage);

			// Add the chat message index to the appropriate arrays.
			this.addChatMessageIndex(this.generalChatMessageIndicies);
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
				this.addChatMessageIndex(this.foreignChatMessageIndicies);
				if(this.page === 'Foreign') this.updateSubject.next();
			}

			++this.index;
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


	// Resets the state.
	private resetState(): void
	{
		this.chatMessages.clear();
		this.chatMessageHashes.clear();
		this.index = 0;
		this.generalChatMessageIndicies = [];
		this.superchatMessageIndicies = [];
		this.moderatorChatMessageIndicies = [];
		this.foreignChatMessageIndicies = [];

		this.updateSubject.next();
	}


	// Gets a chat message by index.
	private getChatMessage(chatMessageIndex: number): Types.ChatMessage
	{
		const chatMessage = this.chatMessages.get(chatMessageIndex);
		if(!chatMessage) throw new Error('Could not get a chat message by index.');
		return chatMessage;
	}


	// Adds the chat message index to the given chat message index array, limiting
	// its size and removing chat messages with no references.
	private addChatMessageIndex(chatMessageIndexArray: number[]): void
	{
		// Increment the chat message's reference counter and
		// push the chat message index onto the given array.
		const chatMessage = this.getChatMessage(this.index);
		++chatMessage.references;
		chatMessageIndexArray.push(this.index);

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
			default: return [];
		}
	}
}
