/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


import {trigger, animate, transition, style} from '@angular/animations';

import * as Constants from './constants';


// Page fade.
export const pageFadeAnimation = trigger
(
	'pageFadeAnimation', [transition('* => *', [style({opacity: 0}),
		animate(`0.16s ${Constants.scrollDelay}s`, style({opacity: 1}))])]
);


// Fade in.
export const fadeInAnimation = trigger
(
	'fadeInAnimation', [transition(':enter', [style({opacity: 0}),
		animate(`0.08s`, style({opacity: 1}))])]
);
