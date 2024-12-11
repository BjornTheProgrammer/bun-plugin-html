import { fromJs } from './js';

console.log('Running JS for browser');

fromJs();

document.querySelector('#js-target').innerHTML = 'Changed!';
