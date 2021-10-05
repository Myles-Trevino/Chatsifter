/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


// Saved state.
export type SavedState =
{
	customQuery: string;
	regexCustomQuery: boolean;
	deepLAuthenticationKey: string;
	showScrollbar: boolean;
	smoothScroll: boolean;
};

export const defaultSavedState: SavedState =
{
	customQuery: '[EN]',
	regexCustomQuery: false,
	deepLAuthenticationKey: '',
	showScrollbar: true,
	smoothScroll: true
};


// IPC message.
export type IpcMessageType = 'Reset' | 'Orphaned' | 'Title' | 'Chat Message';

export type IpcMessage =
{
	type: IpcMessageType;
	data?: unknown;
};


// UI Message.
export type UiMessageType = 'Normal' | 'Error';

export type UiMessage =
{
	message: string;
	type: UiMessageType;
	duration: number;
};


// Chat message.
export type ChatMessageType = 'Default' | 'Membership' | 'Superchat';
export const defaultChatMessageType: ChatMessageType = 'Default';

export type TranslationStatus = 'Untranslated' | 'Translating' | 'Done';

export type ChatToken =
{
	type: 'Text' | 'Image';
	text?: string;
	translatedText?: string;
	url?: string;
};

export type ChatMessage =
{
	index: number;
	references: number;
	type: ChatMessageType;
	superchatColor: string;
	authorPhoto: string;
	timestamp: string;
	authorName: string;
	superchatAmount: string;
	membershipDuration: string;
	isMember: boolean;
	memberBadge: string;
	isVerified: boolean;
	isModerator: boolean;
	isOwner: boolean;
	tokens: ChatToken[];
	translationStatus: TranslationStatus;
	showTranslation: boolean;
	isForeign: boolean;
};


// Pages.
export type Page = 'General' | 'Superchat' |
'Foreign' | 'Moderator' | 'Custom' | 'Options';

export const defaultPage: Page = 'General';


// DeepL response.
export type DeepLTranslation =
{
	'detected_source_language'?: string;
	'text': string;
};

export type DeepLResponse = {translations: DeepLTranslation[]};
