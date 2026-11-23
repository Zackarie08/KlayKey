// Display-only styling; availability and prices always come from the product API.
const editions={
 'candy-60':{name:'Candy Cane',caption:'A little festive mischief',mark:'01 / 60%',motif:'✧'},
 'noel-75':{name:'Noël',caption:'A classic Christmas, reimagined',mark:'02 / 75%',motif:'✦'},
 'frost-100':{name:'Winter Frost',caption:'A quieter kind of winter',mark:'03 / 100%',motif:'❄'}
};
export function editionStyle(product){if(!product.limited_edition)return null;const key=Object.hasOwn(editions,product.edition_key)?product.edition_key:'noel-75';return {key,...editions[key]};}
export function editionDecoration(edition){return edition?`<span class="edition-art" aria-hidden="true"><span class="edition-orbit"></span><span class="edition-spark edition-spark-one">${edition.motif}</span><span class="edition-spark edition-spark-two">✧</span><span class="edition-spark edition-spark-three">✦</span></span>`:'';}
