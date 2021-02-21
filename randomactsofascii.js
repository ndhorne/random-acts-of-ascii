/*
Copyright 2021 Nicholas D. Horne

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict";

let phrase, phrases, challenge, index, previousIndices = [];
let charsRevealed, revealDelay = 200, infiniswapDelay = 5000;
let titleInterval, infiniswapInterval;
let titleStr = "Random Acts of ASCII";
let aboutText = [
  "Random Acts of ASCII",
  "A pointless diversion by Nicholas D. Horne",
  "Unscramble common but obfuscated colloquial phrases, sayings, "
  + "expressions, and idioms of the English language. The scope of "
  + "randomization does not extend beyond the limits defined by the "
  + "various commonly accepted linguistic word boundaries "
  + "(spaces, hyphens, etc.) of the phrases provided. Hints and "
  + "revelations are available to be revealed at the player's own "
  + "discretion; reserve them for particularly cryptic challenges or "
  + "\"reserve\" them for any challenges.",
  "GNU GPLv3 licensed source code available at "
  + "https://github.com/ndhorne/random-acts-of-ascii"
];

let titleElem = document.getElementById("title");
let challengeElem = document.getElementById("challenge");
let responseElem = document.getElementById("response");
let hintElem = document.getElementById("hintText");
let hintButton = document.getElementById("getHint");
let answerButton = document.getElementById("answer");
let passButton = document.getElementById("pass");
let aboutButton = document.getElementById("aboutDialog");
let revealCharButton = document.getElementById("revealChar");
let revealWordButton = document.getElementById("revealWord");
let revealPhraseButton = document.getElementById("revealPhrase");
let infiniswapCheckbox = document.getElementById("infiniswap");

function randomizeString(
  strArg, delimiters = [" ", "-"], exclusions = [], passes = 1
) {
  let delimiter = delimiters.shift();
  let strArray = strArg.split(delimiter);
  
  for (let i = 0; i < passes; i++) {
    strArray = strArray.map(strElem => {
      if (delimiters[0] ? !strElem.includes(delimiters[0]) : true) {
        let charArray = strElem.split("");
        
        for (let i = 0; i < charArray.length; i++) {
          let randomIndex, temp;
          
          if (exclusions.includes(charArray[i])) {
            continue;
          }
          
          do {
            randomIndex = Math.floor(Math.random() * charArray.length);
          } while (exclusions.includes(charArray[randomIndex]));
          
          temp = charArray[i];
          charArray[i] = charArray[randomIndex];
          charArray[randomIndex] = temp;
        }
        
        return charArray.join("");
      } else {
        return randomizeString(strElem, delimiters, exclusions);
      }
    });
  }
  
  return strArray.join(delimiter);
}

function isFullyRandom(str1, str2, delimiter = " ", exclusions = []) {
  if (typeof str1 != "string" || typeof str2 != "string") {
    throw new Error("Arguments must both be of type string");
  }
  if (str1.length != str2.length) {
    throw new Error("Arguments must be of equal length");
  }
  
  let str1Array = str1.split(delimiter);
  let str2Array = str2.split(delimiter);
  
  outer: for (let i = 0; i < str1Array.length; i++) {
    if (str1Array[i].length == 1) {
      continue;
    }
    
    let occurences = {}, halfLength = str1Array[i].length / 2;;
    Array.prototype.forEach.call(str1Array[i], function(char) {
      occurences[char] = (occurences[char] || 0) + 1;
    });
    
    for (let char in occurences) {
      if (occurences[char] > halfLength) {
        continue outer;
      }
    }
    
    for (let j = 0; j < str1Array[i].length; j++) {
      if (str1Array[i][j] == str2Array[i][j]) {
        if (exclusions.includes(str1Array[i][j])) {
          continue;
        } else {
          return false;
        }
      }
    }
  }
  
  return true;
}

function discreteRandomSwap(
  strArg, delimiters = [" ", "-"], exclusions = [], skip = []
) {
  let delimiter = delimiters.shift();
  let strArray = strArg.split(delimiter);
  let randomIndex;
  
  strArray.forEach(function(word, index) {
    if (word.length == 1 && !skip.includes(index)) {
      skip.push(index);
    }
  });
  
  do {
    randomIndex = Math.floor(Math.random() * strArray.length);
  } while (skip.includes(randomIndex));
  
  strArray = strArray.map(function(word, currentIndex) {
    if (currentIndex != randomIndex) {
      return word;
    } else {
      if (delimiters[0] ? word.includes(delimiters[0]) : false) {
        return discreteRandomSwap(word, delimiters, exclusions).str;
      } else {
        let wordArray, rand1, rand2, temp;
        
        wordArray = word.split("");
        
        do {
          do {
            rand1 = Math.floor(Math.random() * wordArray.length);
          } while (exclusions.includes(wordArray[rand1]));
          do {
            rand2 = Math.floor(Math.random() * wordArray.length);
          } while (exclusions.includes(wordArray[rand2]));
        } while (wordArray[rand1] == wordArray[rand2]);
        
        temp = wordArray[rand1];
        wordArray[rand1] = wordArray[rand2];
        wordArray[rand2] = temp;
        
        return wordArray.join("");
      }
    }
  });
  
  return {
    str: strArray.join(delimiter),
    skipped: skip,
    last: randomIndex
  };
}

function infiniswap(timeout) {
  let infiniswapped = [];
  
  infiniswapInterval = setInterval(function() {
    let obj;
    
    function containsSolution(str1, str2) {
      if (typeof str1 != "string" || typeof str2 != "string") {
        throw new Error("Arguments must both be of type string");
      }
      if (str1.length != str2.length) {
        throw new Error("Arguments must be of equal length");
      }
      
      let str1Array = str1.split(" ");
      let str2Array = str2.split(" ");
      
      for (let i = 0; i < str1Array.length; i++) {
        if (str1Array[i].length < 3) {
          continue;
        }
        
        if (str1Array[i] == str2Array[i]) {
          return true;
        }
      }
      
      return false;
    }
    
    if (infiniswapped.length == phrase.split(" ").length) {
      infiniswapped = [];
    }
    
    do {
      obj = discreteRandomSwap(
        challenge, [" ", "-"], [], infiniswapped
      );
    } while (containsSolution(phrase, obj.str));
    
    if (infiniswapped.length == 0) {
      obj.skipped.forEach(function(index) {
        infiniswapped.push(index);
      });
    }
    
    infiniswapped.push(obj.last);
    
    challengeElem.innerHTML = challenge = obj.str;
  }, timeout);
}

function setChallenge(indexArg) {
  if (indexArg) {
    clearInterval(infiniswapInterval);
  }
  
  charsRevealed = 0;
  hintElem.innerHTML = "";
  responseElem.value = "";
  infiniswapCheckbox.disabled = false;
  
  if (
    typeof indexArg != "number"
    || indexArg < 0
    || indexArg >= phrases.length
  ) {
    if (previousIndices.length == phrases.length) {
      console.log("Phrases exhausted, starting over");
      previousIndices = [];
    }
    do {
      index = Math.floor(Math.random() * phrases.length);
    } while (previousIndices.includes(index));
    previousIndices.push(index);
  } else {
    index = indexArg;
  }
  
  phrase = phrases[index].phrase.toLowerCase().trim();
  
  do {
    challenge = randomizeString(phrase);
  } while (!isFullyRandom(phrase, challenge, " ", ["-"]));
  
  challengeElem.innerHTML = challenge;
  
  /*
  responseElem.style.width = Math.max(
    answerButton.getBoundingClientRect().width
    + passButton.getBoundingClientRect().width,
    challengeElem.getBoundingClientRect().width
  ) + "px";
  */
  
  if (infiniswapCheckbox.checked) {
    infiniswap(infiniswapDelay);
  }
}

function revealUntilNextCharMismatch() {
  function seek(current) {
    while (
      phrase[current] == challenge[current] && current < phrase.length
    ) {
      current++;
    }
    
    return current;
  }
  
  if (infiniswapCheckbox.checked) {
    clearInterval(infiniswapInterval);
  }
  infiniswapCheckbox.disabled = true;
  
  let current = seek(charsRevealed);
  let randomizedIndex = challenge.indexOf(phrase[current], current);
  let strArray = challenge.split("");
  let temp;
  
  temp = strArray[current];
  strArray[current] = strArray[randomizedIndex];
  strArray[randomizedIndex] = temp;
  
  challenge = strArray.join("");
  challengeElem.innerHTML = challenge;
  
  charsRevealed = seek(current);
}

function revealUntilNextWordMismatch() {
  let charsUntilNextWordBoundary;
  
  if (charsRevealed < phrase.lastIndexOf(" ")) {
    charsUntilNextWordBoundary = phrase.indexOf(" ", charsRevealed);
  } else {
    charsUntilNextWordBoundary = phrase.length;
  }
  
  while (charsRevealed < charsUntilNextWordBoundary) {
    revealUntilNextCharMismatch();
  }
}

function revealUntilEndOfPhrase() {
  while (charsRevealed < phrase.length) {
    revealUntilNextCharMismatch();
  }
}

function revealUntilNextWordMismatchTimeoutDelayed(timeout) {
  let charsUntilNextWordBoundary;
  
  if (charsRevealed < phrase.lastIndexOf(" ")) {
    charsUntilNextWordBoundary = phrase.indexOf(" ", charsRevealed);
  } else {
    charsUntilNextWordBoundary = phrase.length;
  }
  
  (function foo(timeout) {
    setTimeout(function() {
      if (charsRevealed < charsUntilNextWordBoundary) {
        revealUntilNextCharMismatch();
        foo(timeout);
      }
    }, timeout);
  })(timeout);
}

function revealUntilEndOfPhraseTimeoutDelayed(timeout) {
  (function foo(timeout) {
    setTimeout(function() {
      if (charsRevealed < phrase.length) {
        revealUntilNextCharMismatch();
        foo(timeout);
      }
    }, timeout);
  })(timeout);
}

function about() {
  alert(
    aboutText.join("\n\n")
  );
}

function setTitle() {
  let titleRandom, doneIndices = [];
  
  do {
    titleRandom = randomizeString(titleStr);
  } while (!isFullyRandom(titleStr, titleRandom));
  
  titleElem.innerHTML = titleRandom;
  
  titleInterval = setInterval(function() {
    let titleArray = titleElem.innerHTML.split("");
    let rand1, rand2, temp;
    
    do {
      rand1 = Math.floor(Math.random() * titleArray.length);
    } while (doneIndices.includes(rand1));
    
    do {
      rand2 = Math.floor(Math.random() * titleArray.length);
    } while (doneIndices.includes(rand2));
    
    if (
      (titleStr[rand1] != titleArray[rand1])
      && (titleStr[rand2] != titleArray[rand2])
    ) {
      temp = titleArray[rand1];
      titleArray[rand1] = titleArray[rand2];
      titleArray[rand2] = temp;
    }
    
    if (titleStr[rand1] == titleArray[rand1]) {
      doneIndices.push(rand1);
    }
    
    if (titleStr[rand2] == titleArray[rand2]) {
      doneIndices.push(rand2);
    }
    
    titleElem.innerHTML = titleArray.join("");
    
    if (titleElem.innerHTML == titleStr) {
      clearInterval(titleInterval);
    }
  }, 15);
}

function initGame() {
  charsRevealed = 0;
  responseElem.value = "";
  infiniswapCheckbox.checked = true;
  
  setTitle();
  setChallenge();
  
  answerButton.addEventListener("click", function(event) {
    if (responseElem.value.toLowerCase().trim() == phrase) {
      clearInterval(infiniswapInterval);
      
      challengeElem.innerHTML = phrase;
      
      alert(
        "Correct!"
        + "\n\n"
        + "\""
        + phrase[0].toUpperCase()
        + phrase.slice(1)
        + "\""
        + (charsRevealed > 0
          ? "\n\n(" + charsRevealed + " characters revealed)"
          : "")
        + (hintElem.innerHTML
          ? "\n\nDid the hint help?"
          : "")
      );
      
      setChallenge();
    } else {
      alert("Incorrect, please try again (or pass)");
    }
    
  });
  
  responseElem.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
      answerButton.click();
    }
  });
  
  passButton.addEventListener("click", function(event) {
    clearInterval(infiniswapInterval);
    
    previousIndices.pop();
    
    setChallenge();
  });
  
  hintButton.addEventListener("click", function(event) {
    hintElem.innerHTML = phrases[index].hint;
  });
  
  revealCharButton.addEventListener("click", function(event) {
    revealUntilNextCharMismatch();
  });
  
  revealWordButton.addEventListener("click", function(event) {
    revealUntilNextWordMismatchTimeoutDelayed(revealDelay);
  });
  
  revealPhraseButton.addEventListener("click", function(event) {
    revealUntilEndOfPhraseTimeoutDelayed(revealDelay);
  });
  
  aboutButton.addEventListener("click", function(event) {
    about();
  });
  
  infiniswapCheckbox.addEventListener("change", function(event) {
    if (infiniswapCheckbox.checked) {
      infiniswap(infiniswapDelay);
    } else {
      clearInterval(infiniswapInterval);
    }
  });
  
  [
    answerButton, hintButton, passButton,
    revealCharButton, revealWordButton, revealPhraseButton
  ].forEach(function(button) {
    button.disabled = false;
  });
}

async function initPhrases() {
  try {
    let response = await fetch("phrases.json");
    let phrases = JSON.parse(await response.text());
    
    return phrases;
  } catch (e) {
    console.error(e);
  }
}

initPhrases().then(function(result) {
  phrases = result.english;
  
  initGame();
});
