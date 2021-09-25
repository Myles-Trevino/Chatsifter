/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {Component, OnInit} from '@angular/core';

import * as Types from './types';
import * as Animations from './animations';
import {StateService} from './services/state.service';


@Component
({
	selector: 'chatsifter-root',
	templateUrl: './chatsifter.component.html',
	styleUrls: ['./chatsifter.component.scss'],
	animations: [Animations.pageFadeAnimation]
})

export class ChatsifterComponent implements OnInit
{
	// Constructor.
	public constructor(public readonly stateService: StateService){}


	// Initializer.
	public ngOnInit(): void { this.stateService.initialize(); }


	// Sets the page.
	public setPage(page: Types.Page): void
	{
		this.stateService.page = page;

		// If this is not the options page, set the chat message type based on the page.
		// Use a delay to allow the page to load when navigating off the options page.
		if(page === 'Options') return;
		setTimeout(() => { this.stateService.pageSubject.next(page); });
	}
}
