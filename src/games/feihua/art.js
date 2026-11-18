(function(root){
function feihuaArt(){return `<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="远山映水，花枝从右侧垂下，一只小杯等待载来诗句">
<defs>
  <linearGradient id="feihua-sky" x2="0" y2="1"><stop stop-color="#edf1e4"/><stop offset=".67" stop-color="#fbf8ed"/><stop offset="1" stop-color="#e3eee3"/></linearGradient>
  <linearGradient id="feihua-water" x2=".85" y2=".7"><stop stop-color="#d6e6db"/><stop offset=".5" stop-color="#edf2e8"/><stop offset="1" stop-color="#bfd5c8"/></linearGradient>
  <linearGradient id="feihua-mountain" x2=".5" y2="1"><stop stop-color="#b9cdc2" stop-opacity=".55"/><stop offset="1" stop-color="#dee7d9" stop-opacity=".15"/></linearGradient>
  <radialGradient id="feihua-halo"><stop stop-color="#fffdf1" stop-opacity=".9"/><stop offset="1" stop-color="#fffdf1" stop-opacity="0"/></radialGradient>
  <g id="feihua-bloom"><g fill="var(--petal,#edbcb1)" stroke="#f7e5d9" stroke-width="1"><ellipse cy="-12" rx="10" ry="16"/><ellipse cy="-12" rx="10" ry="16" transform="rotate(72)"/><ellipse cy="-12" rx="10" ry="16" transform="rotate(144)"/><ellipse cy="-12" rx="10" ry="16" transform="rotate(216)"/><ellipse cy="-12" rx="10" ry="16" transform="rotate(288)"/></g><circle r="6" fill="#c99e58"/><g fill="#f9edc9"><circle cy="-4" r="1.5"/><circle cx="4" cy="1" r="1.5"/><circle cx="-3" cy="3" r="1.5"/></g></g>
</defs>
<rect width="800" height="600" fill="url(#feihua-sky)"/>
<circle class="halo" cx="344" cy="155" r="145" fill="url(#feihua-halo)"/>
<circle class="moon-disc" cx="350" cy="148" r="39" fill="#fffdf0" stroke="#e8e4cd" stroke-opacity=".5"/>
<path d="M0 331Q85 234 136 275Q183 218 238 276Q291 194 344 269Q416 188 464 257Q529 212 579 279Q656 238 706 287L800 277V450H0Z" fill="url(#feihua-mountain)"/>
<path d="M0 377Q111 300 173 335Q240 294 300 341Q363 280 431 337Q496 313 539 358Q635 294 705 349L800 327V443H0Z" fill="#b9cfc0" opacity=".35"/>
<g class="mist" fill="none" stroke="#fffdf1" stroke-width="16" opacity=".35"><path d="M60 337Q230 299 394 334T756 325"/><path d="M-80 383Q180 349 450 379"/></g>
<path d="M0 420Q129 393 299 422Q490 454 800 390V600H0Z" fill="#b4c8ac" opacity=".5"/>
<path d="M0 458Q192 393 353 449Q576 520 800 411V600H0Z" fill="url(#feihua-water)"/>
<path d="M-50 495Q130 427 330 475T850 458" fill="none" stroke="#faf8de" stroke-width="2" opacity=".75"/>
<g class="water-lines" fill="none" stroke="#f7f6e4" stroke-width="1.5" opacity=".8"><path d="M19 515Q186 454 335 494T812 484"/><path d="M150 550Q314 507 486 537T807 510"/><path d="M-20 557Q80 516 144 523"/><path d="M407 566Q620 588 804 548"/></g>
<g class="sway-branch"><g fill="none" stroke-linecap="round"><path d="M813 -12Q721 42 696 138Q674 234 603 273" stroke="#526b5b" stroke-width="8"/><path d="M724 60Q651 81 601 123Q537 177 460 151" stroke="#6c7f64" stroke-width="5"/><path d="M601 123Q606 66 572 28M542 156Q500 116 489 63M697 125Q747 133 773 204M680 192Q616 201 575 238M639 244Q644 295 602 322" stroke="#77866c" stroke-width="3"/><path d="M490 64L461 44M577 237L539 226M460 151L427 133M773 204L790 239M574 28L584 6" stroke="#7c8c72" stroke-width="1.6"/></g>
<g fill="#8da181"><path d="M689 147Q660 110 654 139Q668 156 689 147"/><path d="M614 113Q640 79 647 102Q639 119 614 113"/><path d="M533 150Q504 159 510 176Q531 174 533 150"/><path d="M625 262Q655 253 655 273Q638 280 625 262"/><path d="M751 169Q726 147 728 171Q738 184 751 169"/><path d="M582 58Q558 43 559 65Q568 75 582 58"/></g>
<g opacity=".76"><use href="#feihua-bloom" transform="translate(709 108) scale(.46)"/><use href="#feihua-bloom" transform="translate(613 186) scale(.4)"/><use href="#feihua-bloom" transform="translate(792 44) scale(.55)"/></g>
${[[477,68],[573,35],[451,149],[576,237],[772,201],[604,316]].map((p,i)=>`<g transform="translate(${p.join(' ')})" class="blossom" data-bloom="${i}"><ellipse class="closed-bud" rx="6" ry="10" fill="#bd8e85" transform="rotate(-25)"/><g class="flower-open"><use href="#feihua-bloom"/></g></g>`).join('')}
</g>
<g fill="#f4d4c7" class="falling-petals"><ellipse class="petal p1" cx="543" cy="209" rx="4" ry="8" transform="rotate(-23 543 209)"/><ellipse class="petal p2" cx="668" cy="285" rx="4" ry="7"/><ellipse class="petal p3" cx="410" cy="334" rx="3" ry="6"/></g>
<g class="little-bird" fill="#4b695a"><path d="M0 0Q-18 -26 -35 -20Q-18 -9 0 3Q21 -17 35 -12Q22 1 1 5L-7 13L-3 2Z"/></g>
<g opacity=".65" stroke="#729782" fill="none"><path d="M64 581Q62 530 32 511M62 556Q79 530 94 530M62 542Q49 530 39 536M92 600Q103 553 126 543" stroke-width="2"/><path d="M32 511Q50 516 48 527Q32 529 32 511M94 530Q91 546 78 544Q80 532 94 530M126 543Q127 560 113 565Q110 552 126 543" fill="#729782"/></g>
<g class="cup-route"><ellipse cy="20" rx="39" ry="6" fill="#6d9c89" opacity=".14"/><g class="cup-bob"><path d="M-35 -3Q-28 23 0 23Q28 23 35 -3Z" fill="#ede3c7" stroke="#ac9870" stroke-width="1.5"/><ellipse rx="35" ry="10" cy="-3" fill="#faf4df" stroke="#ac9870" stroke-width="1.5"/><ellipse rx="26" ry="6" cy="-2" fill="#b9c2a1"/><path d="M-14 -12L15 -17L21 -2L-10 2Z" fill="#fffaf0" stroke="#d4c6ab"/><path d="M-7 -8L10 -11M-4 -4L12 -7" stroke="#acb5a3"/></g></g>
</svg>`;}

root.ShanyueFeihuaArt={scene:feihuaArt};
})(globalThis);
