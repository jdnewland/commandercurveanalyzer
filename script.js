// script.js

const idealCurves = {
    2: {
        '1': 9,
        '2': 0,
        '3': 20,
        '4': 14,
        '5': 9,
        '6': 4,
        'Mana rocks': 'Sol Ring + 0 Signet',
        'Lands': 42
    },
    3: {
        '1': 8,
        '2': 19,
        '3': 0,
        '4': 16,
        '5': 10,
        '6': 3,
        'Mana rocks': 'Sol Ring + 0 Signet',
        'Lands': 42
    },
    4: {
        '1': 6,
        '2': 12,
        '3': 13,
        '4': 0,
        '5': 13,
        '6': 8,
        'Mana rocks': 'Sol Ring + 7 Signet',
        'Lands': 39
    },
    5: {
        '1': 6,
        '2': 12,
        '3': 10,
        '4': 13,
        '5': 0,
        '6': 10,
        'Mana rocks': 'Sol Ring + 8 Signet',
        'Lands': 39
    },
    6: {
        '1': 6,
        '2': 12,
        '3': 10,
        '4': 14,
        '5': 9,
        '6': 0,
        'Mana rocks': 'Sol Ring + 9 Signet',
        'Lands': 38
    }
};

async function getCardImage(cardName) {
    const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
    const cardData = await response.json();
    return cardData.image_uris ? cardData.image_uris.normal : null;
}

function analyzeDeckCurve(deckList, commanderCmc) {
    const curve = {};
    const idealCurve = idealCurves[commanderCmc];

    deckList.forEach(card => {
        const cmc = card.cmc; // Converted mana cost

        if (!curve[cmc]) {
            curve[cmc] = 0;
        }
        curve[cmc]++;
    });

    const analysis = {};
    for (let cmc in idealCurve) {
        if (cmc === 'Mana rocks' || cmc === 'Lands') continue;
        analysis[cmc] = (curve[cmc] || 0) - idealCurve[cmc];
    }

    return { analysis, idealCurve };
}

document.getElementById('deck-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const deckList = document.getElementById('deck-list').value.split('\n').map(line => line.trim()).filter(line => line);
    const commanderCmc = parseInt(document.getElementById('commander-cmc').value);
    const cardDetails = await Promise.all(deckList.map(async cardLine => {
        const [count, ...cardNameArr] = cardLine.split(' ');
        const cardName = cardNameArr.join(' ');
        const image = await getCardImage(cardName);
        // Fetch card details from Scryfall to get the CMC
        const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
        const cardData = await response.json();
        return { count: parseInt(count), cardName, image, cmc: cardData.cmc };
    }));

    const { analysis, idealCurve } = analyzeDeckCurve(cardDetails, commanderCmc);
    
    displayResults(cardDetails, analysis, idealCurve);
});

function displayResults(cardDetails, analysis, idealCurve) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    cardDetails.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.innerHTML = `
            <img src="${card.image}" alt="${card.cardName}">
            <p>${card.count}x ${card.cardName}</p>
        `;
        resultsDiv.appendChild(cardDiv);
    });

    const analysisDiv = document.createElement('div');
    analysisDiv.classList.add('analysis');
    for (let cmc in analysis) {
        const diff = analysis[cmc];
        analysisDiv.innerHTML += `<p>CMC ${cmc}: ${diff >= 0 ? '+' : ''}${diff}</p>`;
    }
    resultsDiv.appendChild(analysisDiv);

    const idealDiv = document.createElement('div');
    idealDiv.classList.add('ideal');
    idealDiv.innerHTML = `<h3>Ideal Curve for Commander with CMC ${commanderCmc}</h3>`;
    for (let cmc in idealCurve) {
        if (cmc === 'Mana rocks' || cmc === 'Lands') {
            idealDiv.innerHTML += `<p>${cmc}: ${idealCurve[cmc]}</p>`;
        } else {
            idealDiv.innerHTML += `<p>CMC ${cmc}: ${idealCurve[cmc]}</p>`;
        }
    }
    resultsDiv.appendChild(idealDiv);
}
