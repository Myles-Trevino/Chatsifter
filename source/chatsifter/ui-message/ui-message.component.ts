/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import type {OnDestroy, OnInit} from '@angular/core';
import {ChangeDetectorRef, Component} from '@angular/core';
import type {Subscription} from 'rxjs';

import type * as Types from '../types';
import {UiMessageService} from '../services/ui-message.service';


@Component
({
	selector: 'chatsifter-ui-message',
	templateUrl: './ui-message.component.html',
	styleUrls: ['./ui-message.component.scss']
})

export class UiMessageComponent implements OnInit, OnDestroy
{
	public message = '';
	public type: Types.UiMessageType = 'Normal';
	public visible = false;

	private subscription?: Subscription;
	private duration = 0;
	private timeout?: NodeJS.Timeout;


	// Constructor.
	public constructor(private readonly uiMessageService: UiMessageService,
		private readonly changeDetectorRef: ChangeDetectorRef){}


	// Initializer.
	public ngOnInit(): void
	{
		this.subscription = this.uiMessageService.messages.asObservable()
			.subscribe((uiMessageData) => { this.messageCallback(uiMessageData); });
	}


	// Destructor.
	public ngOnDestroy(): void { this.subscription?.unsubscribe(); }


	// Closes the message.
	public close(): void
	{
		this.visible = false;
		this.changeDetectorRef.detectChanges();
	}


	// Message callback.
	private messageCallback(message: Types.UiMessage): void
	{
		// If a message is visible, close it and wait for it to fade out before
		// calling createMessage(). Otherwise, call createMessage() right away.
		const wasVisible = this.visible;
		this.visible = false;

		if(wasVisible) setTimeout(() => { this.createMessage(message); }, 160);
		else this.createMessage(message);
	}


	// Creates the given message.
	private createMessage(message: Types.UiMessage): void
	{
		this.message = message.message;
		this.duration = message.duration*1000;
		this.type = message.type;
		this.visible = true;
		this.changeDetectorRef.detectChanges();

		if(this.timeout)
		{
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}

		if(this.duration > 0)
			this.timeout = setTimeout(() => { this.close(); }, this.duration);
	}
}
