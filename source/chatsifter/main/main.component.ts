/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {Component} from '@angular/core';

import {StateService} from '../services/state.service';


@Component
({
	selector: 'chatsifter-main',
	templateUrl: './main.component.html',
	styleUrls: ['./main.component.scss']
})

export class MainComponent
{
	public constructor(public readonly stateService: StateService){}
}
