/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {AfterViewInit, ChangeDetectorRef, Component,
	OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {NgScrollbar} from 'ngx-scrollbar';
import * as Rxjs from 'rxjs';

import * as Constants from '../constants';
import * as Types from '../types';
import * as Animations from '../animations';
import {StateService} from '../services/state.service';
import {MessageService} from '../services/message.service';


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


	// Constructor.
	public constructor(public readonly stateService: StateService,
		private readonly changeDetectorRef: ChangeDetectorRef,
		private readonly httpClient: HttpClient,
		private readonly messageService: MessageService){}


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


	// Translate the given message.
	public async translate(message: Types.ChatMessage): Promise<void>
	{
		// Toggle translation visibility.
		message.showTranslation = !message.showTranslation;

		// If the translation is hidden or translation
		// has been or is being attempted, return.
		if(!message.showTranslation || message.translationStatus !== 'Untranslated')
		{
			this.changeDetectorRef.detectChanges();
			return;
		}

		// Otherwise, attempt to translate.
		try
		{
			// Update the translation status.
			message.translationStatus = 'Translating';
			this.changeDetectorRef.detectChanges();

			if(!this.stateService.savedState.deepLAuthenticationKey)
				throw new Error('No DeepL authentication key provided.');

			// Create the initial URL parameters.
			const initialParameters =
			{
				'auth_key': this.stateService.savedState.deepLAuthenticationKey,
				'source_lang': 'JA',
				'target_lang': 'EN-US'
			};

			let parameters = new HttpParams({fromObject: initialParameters});

			// Add each text token as a URL parameter.
			for(const token of message.tokens)
				if(token.type === 'Text' && token.text)
					parameters = parameters.append('text', token.text);

			// Send the translation request to DeepL.
			const response = await Rxjs.firstValueFrom(
				this.httpClient.get<Types.DeepLResponse>(
					Constants.deepLApiUrl, {params: parameters}));

			// Save the translated text to each text token.
			let translationTokenIndex = 0;

			for(const token of message.tokens)
			{
				if(token.type !== 'Text') continue;
				token.translatedText = response.translations[translationTokenIndex].text;
				++translationTokenIndex;
			}

			// Update the translation status.
			message.translationStatus = 'Done';
			this.changeDetectorRef.detectChanges();
		}

		// Handle errors.
		catch(error: unknown)
		{
			message.showTranslation = false;
			message.translationStatus = 'Untranslated';
			this.changeDetectorRef.detectChanges();
			this.messageService.error(new Error('Translation failed. Make sure '+
				'you set the DeepL key in the options page correctly.'));
		}
	}


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
