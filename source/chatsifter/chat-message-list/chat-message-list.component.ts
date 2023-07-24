/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {AfterViewInit, ChangeDetectorRef, Component,
	OnInit, ViewChild} from '@angular/core';
import {NgScrollbar} from 'ngx-scrollbar';

import * as Constants from '../constants';
import * as Types from '../types';
import * as Animations from '../animations';
import {StateService} from '../services/state.service';


@Component
({
	selector: 'chatsifter-chat-message-list',
	templateUrl: './chat-message-list.component.html',
	styleUrls: ['./chat-message-list.component.scss'],
	animations: [Animations.fadeInAnimation]
})

export class ChatMessageListComponent implements OnInit, AfterViewInit
{
	@ViewChild('scrollbar') private readonly scrollbar?: NgScrollbar;

	public autoscroll = true;
	public chatMessages: Types.ChatMessage[] = [];
	public constants = Constants;


	// Constructor.
	public constructor(public readonly stateService: StateService,
		private readonly changeDetectorRef: ChangeDetectorRef){}


	// Initializer.
	public ngOnInit(): void
	{
		// Subscribe to page changes.
		this.stateService.pageSubject.subscribe(() => { this.updateCallback(true); });

		// Subscribe to chat updates.
		this.stateService.updateSubject.subscribe(() => { this.updateCallback(); });
	}


	// Initializes the scrollbar.
	public ngAfterViewInit(): void
	{
		if(!this.scrollbar) throw new Error('Could not get the scrollbar.');

		// Scroll to the bottom immediately.
		this.updateCallback(true);

		// Subscribe to scroll events.
		this.scrollbar.scrolled.subscribe((event: Event) =>
		{
			const target = event.target as HTMLElement | null;
			if(!target) return;
			const distance = (target.scrollHeight - target.scrollTop) - target.offsetHeight;
			this.autoscroll = (distance < Constants.autoscrollMargin);
		});
	}


	// Message track by.
	public messageTrackBy(index: number, chatMessage: Types.ChatMessage): number
	{ return chatMessage.index; }


	// Token track by.
	public tokenTrackBy(index: number): number { return index; }


	// Called when the chat messages have updated.
	private updateCallback(reset = false): void
	{
		// Update the chat messages.
		if(!this.autoscroll && !reset) return;
		this.chatMessages = this.stateService.getChatMessages();
		this.changeDetectorRef.detectChanges();

		// Delay as a workaround for ng-scrollbar not fully
		// scrolling to the bottom on large content updates.
		setTimeout(() =>
		{
			this.scrollbar?.scrollTo
			({
				bottom: 0,
				duration: (reset || !this.stateService.savedState.smoothScroll) ? 0 : 67
			});
		}, Constants.scrollDelay);
	}
}
