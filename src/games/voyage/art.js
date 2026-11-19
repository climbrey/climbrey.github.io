(function(root){
'use strict';
const paths={
 release:'M445 285 C436 315 479 354 457 398 C451 418 447 432 450 447',
 bamboo:'M450 447 C417 468 333 461 282 503 C256 527 249 552 237 577',
 lotus:'M450 447 C508 456 562 466 597 507 C624 535 651 542 669 576',
 bambooInside:'M237 577 C185 608 122 633 151 701 C172 745 279 756 286 805',
 bambooOutside:'M237 577 C283 598 350 626 331 685 C320 727 271 755 286 805',
 lotusInside:'M669 576 C732 618 789 650 768 712 C751 749 675 768 654 814',
 lotusOutside:'M669 576 C617 603 557 632 577 692 C601 738 667 758 654 814',
 bambooBlocked:'M237 577 C246 607 240 628 215 652',
 lotusBlocked:'M669 576 C668 611 680 635 705 654'
};
function scene(prefix='voyage'){
const id=n=>prefix+'-'+n,ref=n=>'url(#'+id(n)+')';
const leaf=(x,y,s,a=0)=>`<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><ellipse cy="13" rx="61" ry="22" fill="#153f4050"/><path d="M-66 0C-84-43-37-64 0-42 48-70 95-29 60 8 31 35-32 33-66 0Z" fill="${ref('leaf')}"/><path d="M0 2-53-13M0 2 4-39M0 2 51-16M0 2 39 18M0 2-32 17" fill="none" stroke="#c8daa5" stroke-opacity=".45" stroke-width="1.5"/><path d="M-5 3 0-18 12 2" fill="#83beb2"/></g>`;
const flower=(x,y,s)=>`<g class="lotus-flower" transform="translate(${x} ${y}) scale(${s})"><path d="M0 12Q-7 54-2 85" fill="none" stroke="#547b4f" stroke-width="3"/><path d="M0 10Q-46-12-40-34-13-33 0-5Q12-40 40-34 40-10 0 10" fill="#dc9d8e"/><path d="M0 11Q-28-16-18-44 2-37 7-10Q9-30 24-36 31-8 0 11" fill="#f5d1b9"/><path d="M0 10Q-13-17 0-53 20-21 0 10" fill="#fff0d5"/><ellipse cy="11" rx="14" ry="5" fill="#ccb967"/></g>`;
const bamboo=(x,y,s,flip=1)=>`<g class="bamboo-spray" transform="translate(${x} ${y}) scale(${s*flip} ${s})"><path d="M0 70Q8-28 55-138M6 21Q-39-28-92-40M20-40Q64-70 132-59M35-82Q-16-119-57-118" fill="none" stroke="#24554d" stroke-width="4"/><g fill="#215c50"><path d="M9 16Q-58 14-94-38-41-28 9 16M-26-17Q-54-78-74-77-69-29-26-17M24-42Q67-116 93-111 70-65 24-42M56-59Q110-68 146-39 92-34 56-59M36-83Q-10-102-63-117-35-137 36-83M42-105Q22-155 35-178 54-138 42-105M58-144Q80-177 111-185 103-154 58-144"/></g></g>`;
const pebbles=Array.from({length:24},(_,i)=>{const t=i/23,x=410+Math.sin(t*8)*45,y=470+t*290;return `<ellipse cx="${x}" cy="${y}" rx="${9+i%4*3}" ry="${5+i%3*2}" fill="${i%2?'#899b76':'#cad2a5'}" transform="rotate(${i*19} ${x} ${y})"/>`;}).join('');
const glints=Array.from({length:30},(_,i)=>`<path d="M${90+(i*113)%720} ${180+(i*79)%740}h${9+i%5*9}" stroke="#e3f4d7" opacity="${.13+i%3*.08}" stroke-linecap="round" stroke-width="2"/>`).join('');
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1000" class="pond-art" role="img" aria-label="竹影环绕的荷塘，一只纸舟正等着水流。左岸竹影，右岸荷叶。">
<defs>
<linearGradient id="${id('water')}" x2=".7" y2="1"><stop stop-color="#cfdfbb"/><stop offset=".36" stop-color="#a2c8af"/><stop offset=".72" stop-color="#72ada3"/><stop offset="1" stop-color="#397f80"/></linearGradient>
<linearGradient id="${id('bank')}" x2=".4" y2="1"><stop stop-color="#c4cb8c"/><stop offset=".6" stop-color="#729566"/><stop offset="1" stop-color="#356456"/></linearGradient>
<linearGradient id="${id('leaf')}" x2=".5" y2="1"><stop stop-color="#a4bc73"/><stop offset=".45" stop-color="#709a63"/><stop offset="1" stop-color="#2c705e"/></linearGradient>
<linearGradient id="${id('mist')}" x2="0" y2="1"><stop stop-color="#f9f2d8"/><stop offset="1" stop-color="#f9f2d8" stop-opacity="0"/></linearGradient>
<radialGradient id="${id('light')}"><stop stop-color="#ffffde" stop-opacity=".65"/><stop offset="1" stop-color="#f8eeb9" stop-opacity="0"/></radialGradient>
<pattern id="${id('grain')}" width="67" height="59" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r=".7" fill="#173f39" opacity=".12"/><circle cx="31" cy="43" r="1.2" fill="#fff6d5" opacity=".25"/><path d="m13 22 2 1m37-7 3 1m-32 34 3-1m42-15h2" stroke="#f7eaca" opacity=".2"/></pattern>
</defs>
<rect width="900" height="1000" fill="${ref('water')}"/>
<path d="M0 125Q113 17 238 117T465 78T713 126T900 47V0H0" fill="#8ea882" opacity=".6"/>
<path d="M0 180Q143 65 277 154T542 126T900 145V0H0" fill="#aab99a" opacity=".6"/>
<rect width="900" height="330" fill="${ref('mist')}"/>
<ellipse cx="615" cy="315" rx="310" ry="340" fill="${ref('light')}"/>
<g fill="none" stroke="#577a69" stroke-width="2" opacity=".5"><path d="M607 102q10-13 22 0 10-13 22 0M667 134q8-10 17 0 9-10 17 0"/></g>
<g opacity=".2" fill="#366959"><path d="M0 270Q146 236 234 351L175 609 0 692Z"/><path d="M900 255Q757 258 725 362L775 627 900 710Z"/></g>
<g class="banks"><path d="M0 0H360Q405 155 357 241C312 309 208 337 181 426S70 557 0 579Z" fill="${ref('bank')}"/><path d="M900 0H553Q494 162 557 254C612 326 729 311 761 412S823 548 900 589Z" fill="${ref('bank')}"/><path d="M418 463C364 490 344 536 374 587C403 635 368 709 430 768C470 800 536 757 516 700C495 637 544 565 519 516Q486 461 418 463Z" fill="#47796866"/><path d="M421 452C368 478 349 525 381 576C409 625 376 700 435 753C466 780 522 744 506 693C485 630 535 557 508 505Q480 452 421 452Z" fill="${ref('bank')}"/>
<path d="M0 0H337Q389 151 342 229C295 299 185 326 164 417S54 541 0 553M900 0H575Q520 152 577 244C639 314 744 299 779 408S840 534 900 568" fill="none" stroke="#d3d6a3" stroke-width="14" opacity=".7"/></g>
<g class="water-glints">${glints}</g>
<g fill="none" stroke="#e4efd1" stroke-width="2" opacity=".28"><path d="M337 276q57 56 35 99M561 284q-30 55-7 95M117 677q-41 59 26 94M768 692q29 61-17 94M322 886q125 35 250 0"/></g>
<g class="current-lines" fill="none" stroke="#f7edb8" stroke-linecap="round" stroke-width="3" stroke-dasharray="3 22" opacity=".5">${Object.entries(paths).filter(([n])=>!n.includes('Blocked')).map(([n,d])=>`<path data-stream="${n}" d="${d}"/>`).join('')}</g>
<g class="preview-current" fill="none" stroke="#fff4b8" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 21"><path class="preview-path" d="${paths.release}"/></g>
<g class="rocks" fill="#7d9a83" stroke="#bccaa6" stroke-width="3"><path d="M188 663Q182 645 201 639T231 640Q254 651 238 674T201 678Z"/><path d="M678 660Q674 643 695 636T725 639Q746 657 731 674T695 679Z"/></g>
${pebbles}
<g opacity=".4" fill="#305f4e"><path d="m82 253 62-179 9 4-49 183ZM170 295l35-257 8 1-21 259ZM665 232 628 13l8-1 44 229Z"/></g>
${bamboo(50,245,1.35)}${bamboo(162,290,.9)}${bamboo(716,225,1,-1)}${bamboo(450,530,.75,-1)}
<g class="lotus-cluster">${leaf(790,455,1.05,-16)}${leaf(704,427,.69,9)}${leaf(812,530,.6,23)}${leaf(568,732,.7,-23)}${leaf(765,814,.97,10)}${leaf(806,737,.66,-19)}${leaf(585,867,.75,10)}${leaf(120,811,.7,-10)}${leaf(185,868,.55,20)}${flower(781,453,.77)}${flower(807,768,.9)}${flower(592,849,.57)}</g>
<g class="small-lotus" transform="translate(310 789)"><ellipse cy="40" rx="30" ry="7" fill="#b6d9ba" opacity=".5"/><path d="M0 39Q-10 7 0-40" fill="none" stroke="#386950" stroke-width="4"/><path d="M0-38Q-20-58-9-76 2-70 12-60Z" fill="#aec177"/><path d="M-9-76 0-38" stroke="#e5d5a3" fill="none"/><g class="dragonfly" transform="translate(-7 -79)"><g fill="#f9edc6" fill-opacity=".85" stroke="#d8bc85" stroke-width=".7"><ellipse cx="-15" cy="-5" rx="20" ry="5" transform="rotate(18)"/><ellipse cx="15" cy="-5" rx="20" ry="5" transform="rotate(-18)"/><ellipse cx="-14" cy="4" rx="18" ry="4" transform="rotate(-15)"/><ellipse cx="14" cy="4" rx="18" ry="4" transform="rotate(15)"/></g><path d="M0-7V21" stroke="#654f34" stroke-width="3"/><circle cy="-8" r="3" fill="#765c37"/></g></g>
<g class="fish-school" fill="#e1c28b" opacity=".8">${[0,1,2].map(i=>`<g class="fish" transform="translate(${659+i*40} ${838+i%2*23}) rotate(${-50+i*24})"><path d="M0-18C17-7 11 17 0 22-12 12-13-9 0-18M0 18-11 34 0 30 11 34Z"/><path d="M0-6V14" stroke="#866e54" opacity=".5"/></g>`).join('')}</g>
<g class="sluice" transform="translate(446 192)"><path d="M-69-32-48-44 53-36 68-20 56 8-59 5Z" fill="#6d8272"/><path d="M-51-25 48-19 42-1-47-3Z" fill="#2a514a"/><g class="gate"><path d="M-49-22 48-17 45 1-49-2Z" fill="#b89a69"/><path d="m-35-19 1 15m19-14v15m21-14v15m22-14-1 15" stroke="#7e694a" stroke-width="2"/></g></g>
<g class="blocking-leaf" transform="translate(456 354)">${leaf(0,0,.56,-13)}</g>
<g class="steering-leaf" transform="translate(237 577)"><g class="leaf-turn">${leaf(0,0,.55,0)}<path d="M-31 0H30m-9-8 9 8-9 8" fill="none" stroke="#eee9b7" stroke-width="2"/></g></g>
<g class="boat-position" transform="translate(445 285)"><g class="boat-bob"><ellipse cy="20" rx="31" ry="12" fill="#244c4b" opacity=".25"/><path d="M-40-3 40-3 22 23-19 23Z" fill="#fff1c9"/><path d="M-40-3 0 9 40-3 0-29Z" fill="#f9f3dc"/><path d="M0-29 0 9-40-3Z" fill="#dfc993"/><path d="M0 9 22 23 40-3" fill="#d4b87a"/><path d="M0-29v38l-19 14" fill="none" stroke="#aa9161" stroke-width="1"/></g></g>
<g class="touch-rings" fill="none" stroke="#f6efd1" stroke-width="2"><ellipse class="ripple-one" rx="40" ry="14"/><ellipse class="ripple-two" rx="65" ry="23"/></g>
<path d="M0 979Q113 850 229 966T456 985T680 962T900 912V1000H0" fill="#214f47"/>
${leaf(28,944,1.7,-10)}${leaf(876,957,1.5,20)}${flower(99,967,1.2)}${bamboo(-62,740,1.15)}${bamboo(960,850,1.2,-1)}
<rect width="900" height="1000" fill="${ref('grain')}" pointer-events="none"/>
</svg>`;
}
root.ShanyueVoyageArt={scene,paths};
})(globalThis);
