/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {Component, ChangeDetectorRef, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import * as Types from './types';
import * as Constants from './constants';
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
	public constructor(public readonly stateService: StateService,
		private readonly changeDetectorRef: ChangeDetectorRef,
		private readonly activatedRoute: ActivatedRoute){}


	// Initializer.
	public ngOnInit(): void
	{
		// Subscribe to bound tab title changes.
		this.stateService.boundTabTitleSubject.subscribe(
			() => { this.changeDetectorRef.detectChanges(); });

		// When the query parameters have changed, if the query
		// parameters are populated, initialize the state service.
		this.activatedRoute.queryParamMap.subscribe((queryParamMap) =>
		{
			const boundTabId = queryParamMap.get(Constants.boundTabIdQueryParamKey);
			const boundTabTitle = queryParamMap.get(Constants.boundTabTitleQueryParamKey);

			if(boundTabId && boundTabTitle) this.stateService.initialize(
				Number.parseInt(boundTabId), boundTabTitle);
		});
	}


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
