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

async function getCardData(cardName) {
    const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
    if (!response.ok) {
        console.error(`Error fetching card data for ${cardName}`);
        return null;
    }
    return await response.json();
}

async function analyzeDeckCurve(deckList, commanderCmc) {
    const curve = {};
    const idealCurve = idealCurves[commanderCmc];

    const cardDetails = await Promise.all(deckList.map(async (cardLine) => {
        const [count, ...cardNameArr] = cardLine.split(' ');
        const cardName = cardNameArr.join(' ');
        const cardData = await getCardData(cardName);
        if (!cardData) return null;
        const cmc = cardData.cmc;

        if (!curve[cmc]) {
            curve[cmc] = 0;
        }
        curve[cmc] += parseInt(count);

        return { count: parseInt(count), cardName, image: cardData.image_uris ? cardData.image_uris.normal : '', cmc };
    }));

    const analysis = {};
    for (let cmc in idealCurve) {
        if (cmc === 'Mana rocks' || cmc === 'Lands') continue;
        analysis[cmc] = (curve[cmc] || 0) - idealCurve[cmc];
    }

    return { cardDetails: cardDetails.filter(c => c !== null), analysis, idealCurve };
}

function calculateGrade(analysis) {
    let totalDifference = 0;
    for (let cmc in analysis) {
        totalDifference += Math.abs(analysis[cmc]);
    }
    const maxDifference = Object.keys(analysis).length * 10; // Example calculation
    const score = (1 - (totalDifference / maxDifference)) * 100;
    let grade = '';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';
    return grade;
}

document.getElementById('deck-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const deckList = document.getElementById('deck-list').value.split('\n').map(line => line.trim()).filter(line => line);
    const commanderCmc = parseInt(document.getElementById('commander-cmc').value);
    const { cardDetails, analysis, idealCurve } = await analyzeDeckCurve(deckList, commanderCmc);
    const grade = calculateGrade(analysis);
    displayResults(cardDetails, analysis, idealCurve, grade);
});

document.getElementById('archidekt-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const archidektUrl = document.getElementById('archidekt-url').value;
    const deckId = archidektUrl.split('/').pop();
    const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
    const data = await response.json();
    const deckList = data.cards.map(card => `${card.quantity} ${card.card.oracleCard.name}`);
    document.getElementById('deck-list').value = deckList.join('\n');
});

function displayResults(cardDetails, analysis, idealCurve, grade) {
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
        analysisDiv.innerHTML += `<p>CMC ${cmc}: ${diff >= 0 ? '+' : ''}${diff} (Ideal: ${idealCurve[cmc]}, Missing/Excess: ${Math.abs(diff)})</p>`;
    }
    analysisDiv.innerHTML += `<p>Lands: ${idealCurve['Lands']}</p>`;
    resultsDiv.appendChild(analysisDiv);

    const gradeDiv = document.createElement('div');
    gradeDiv.classList.add('grade');
    gradeDiv.innerHTML = `<h3>Deck Grade: ${grade}</h3>`;
    resultsDiv.appendChild(gradeDiv);

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
