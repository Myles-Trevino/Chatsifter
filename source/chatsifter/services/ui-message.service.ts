/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

import type * as Types from '../types';


@Injectable({providedIn: 'root'})

export class UiMessageService
{
	public readonly messages = new Subject<Types.UiMessage>();


	// Sends a normal message.
	public message(message: string, duration = 3): void
	{ this.messages.next({message, type: 'Normal', duration}); }


	// Sends an error message.
	public error(error: Error, duration = 5): void
	{
		console.error(error);
		this.messages.next({message: error.message, type: 'Error', duration});
	}
}
