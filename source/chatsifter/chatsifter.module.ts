/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HttpClientModule} from '@angular/common/http';

import {NgScrollbarModule} from 'ngx-scrollbar';

import {RoutingModule} from './routing.module';
import {ChatsifterComponent} from './chatsifter.component';
import {MessageComponent} from './message/message.component';
import {ChatMessageListComponent} from './chat-message-list/chat-message-list.component';
import {MainComponent} from './main/main.component';
import {OptionsComponent} from './options/options.component';
import {SwitchComponent} from './switch/switch.component';


@NgModule
({
	declarations:
	[
		ChatsifterComponent,
		MessageComponent,
		ChatMessageListComponent,
		MainComponent,
		OptionsComponent,
		SwitchComponent
	],
	imports:
	[
		CommonModule,
		FormsModule,
		BrowserModule,
		BrowserAnimationsModule,
		HttpClientModule,
		RoutingModule,
		NgScrollbarModule.withConfig({visibility: 'hover'})
	],
	providers: [],
	bootstrap: [ChatsifterComponent]
})

export class ChatsifterModule{}
