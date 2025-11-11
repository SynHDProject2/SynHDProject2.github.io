let TYPES = ["M", "R", "W", "S"];
let RARTS = ["2C1", "2C2", "2C3", "2R1", "2R2", "2E1", "1M1"];

let gameId = null;
let hand = -1;
let players = [];
let currentTurn = 0; 

let classTypes = {
  "Knight":"W",
  "Archer":"R",
  "Mage":"M",
  "Warlock":"S"
};
let colors = {
  "Knight":"#ffd966",
  "Archer":"#b6d7a8",
  "Mage":"#6fa8dc",
  "Warlock":"#c27ba0"
};
let colorsDark = {
  "Knight":"#ac881d",
  "Archer":"#649051",
  "Mage":"#2c679c",
  "Warlock":"#882d5d"
};
let classes = [
  "Knight",
  "Archer",
  "Mage",
  "Warlock"
];
let classBuffs = [
  [0, 0, -1, 2],
  [2, -1, 0, 0],
  [0, 20, 0, -10]
];
let abilities = [
  [
    "Royal Aura: Ignore true damage dealt\nby Magic Weapons.",
    "Castle Armory: At the start of the game,\nand at each Intermission, gain an Armor Token."
  ],
  [
    "Magical Quiver: Start the game with a\nSpeed Token and a token of your choice.",
    "Nimble Feet: Once per combat, dodge the\ndamage of an attack of your choice."
  ],
  [
    "Hoarding: At the start of the game,\ngain a random Game and Combat Token.",
    "Enchanted Lifeline: Once per combat,\ninstead of dying block all damage until\nyour next turn. Live on 15."
  ],
  [
    "Overconfidence: While at or above 5 Life Points,\ngain +2 attack, and below it, gain +2 armor.",
    "Demonic Essence: When you use a Soul weapon,\nheal for a third of the damage of the weapon."
  ],
  "Empowered Strikes: After you use a card\nfrom your class, your next hit\ndeals +5 damage."
];
let cards = {
  "MC1":"Piercing Wand",
  "MC2":"Mushroom on a Stick",
  "MC3":"Scepter of Wisdom",
  "MR1":"Ethereal Enhancements",
  "MR2":"Conjuring Staff",
  "ME1":"Glass Orb",
  "MM1":"Mindbreaker",
  "RC1":"Shurikens",
  "RC2":"Throwing Spear",
  "RC3":"Compound Crossbow",
  "RR1":"Luminecent Shotter",
  "RR2":"Terrain Bow",
  "RE1":"Blowdarts",
  "RM1":"Stormshot",
  "WC1":"Copper Ward",
  "WC2":"Smithing Hammer",
  "WC3":"Scimitar of Judgement",
  "WR1":"Thick Cleaver",
  "WR2":"Heavy Axe",
  "WE1":"Sentinel's Sword",
  "WM1":"Vulcan's Greatsword",
  "SC1":"Explosive Darkblade",
  "SC2":"Firespit Scythe",
  "SC3":"Soul Barrier",
  "SR1":"Shadow Dagger",
  "SR2":"Demonic Boomerang",
  "SE1":"Dual Scythes",
  "SM1":"Reaper of Souls",
  "JJ1":"Incantation"
};
let tokenNames = ["Attack", "Armor", "Speed", "Health", "Arcane", "Mushroom", "Recycle", "Life"];
let tokenColors = ["#b50000", "#ffa444", "#7fcf7e", "#d64545", "#6dc5d6", "#ff6969", "#6688ff", "#ffdd61"];
let incantationNames = ["King's Blessing", "Super Speed", "Arcanography", "Ultimate Confrontation"];

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let width, height, fontSize;
// canvas.style.transform = "scale(0.25)";
// canvas.style.transformOrigin = "top left";

let message = function(event) {
  if (event.message.startsWith("TP")) {
    if (Deck.deck.length == 0) {
      setUpGame(event.message.slice(2));
      checkHistory("TP-JL" + gameId, 100, 1);
    }
  } else if (event.message.startsWith("Join")) {
    let data = event.message.slice(4).split(";");
    let h = parseInt(data[0]);
    players[h].online = true;
    players[h].joined = true;
    players[h].uuid = data[1];
    if (hand == h) {
      if (players[h].ingame) {
        GameGUI.start();
      } else {
        ClassGUI.start();
      }
    }
    log("Player " + (h + 1) + " joined the game. (" + Player.count(true) + "/" + players.length + ")");
  } else if (event.message.startsWith("User")) {
    let data = event.message.slice(4).split(";");
    let p = players[parseInt(data.shift())];
    p.ingame = true;
    p.name = data.shift();
    p.class = classes[parseInt(data.shift())];
    p.armor = parseInt(data.shift());
    p.speed = parseInt(data.shift());
    p.attack = parseInt(data.shift());
    p.ability = data.shift();
    p.health = 100;
    if (p.ability == "Nimble Feet") {
      p.protections.push(0);
    }
    while (data.length > 0) {
      token(p, data.shift(), false);
    }

    let speeds = [];
    for (let i = 0; i < players.length; i++) {
      if (players[i].ingame) {
        speeds.push(players[i]);
      }
    }
    speeds.sort(function(a, b) {
      return b.speed - a.speed;
    });
    for (let i = 0; i < speeds.length; i++) {
      speeds[i].pos = i;
    }
    if (hand > -1) {
      Player.target = players[hand].pos;
      Player.nextTarget();
    }
     if (Player.count(true) === players.length) {
      players.sort((a, b) => {
        if (b.speed === a.speed) {
          return Math.random() - 0.5;
        }
        return b.speed - a.speed;
      });
      currentTurn = players[0].id;
      log("#000000" + players[currentTurn].name + " will go first (highest speed).");
    }
    window.requestAnimationFrame(GameGUI.draw);
  } else if (event.message.startsWith("Grab")) {
    let data = event.message.slice(4).split(";");
    let pNum = parseInt(data[0]);
    let cardNum = parseInt(data[1]);
    if (cardNum == 0) {
      if (Deck.deck.length > 0) {
        let card = Deck.deck.pop()
        card.grab(pNum);
        players[pNum].hand.push(card);
      }
    } else {
      if (Deck.played[1].length > cardNum - 1) {
        Deck.played[1][cardNum - 1].grab(pNum);
        players[pNum].hand.push(Deck.played[1][cardNum - 1]);
        if (Deck.deck.length > 0) {
          let card = Deck.deck.pop();
          card.image.src = "./images/tapp/" + card.card[0] + card.card[1] + ".webp";
          Deck.played[1][cardNum - 1] = card;
        } else {
          Deck.played[1][cardNum - 1] = null;
        }
      }
    }
    for (let i = 0; i < players[pNum].hand.length; i++) {
      players[pNum].hand[i].separate(players[pNum].hand.length, i + 1);
    }
    if (Player.recycle[0] > -1) {
      Player.recycle[2] += 1;
      if (Player.recycle[1] <= Player.recycle[2]) {
        Player.recycle = [-1, 0, 0];
        log("> " + colorsDark[players[pNum].class] + players[pNum].name + " #000000finished using their Recycle Token.");
      }
    }
    window.requestAnimationFrame(GameGUI.draw);
  } else if (event.message.startsWith("Play")) {
    let splitData = event.message.slice(4).split(";");
    let data = splitData.splice(0, 3).concat(splitData.join(";"));
    let player = players[parseInt(data[0])];
    for (let i = 0; i < player.hand.length; i++) {
      if (data[1] == player.hand[i].card[0] + player.hand[i].card[1]) {
        let card = player.hand[i];
        card.play(player, data[2], data[3]);
        player.hand.splice(player.hand.indexOf(card), 1);
        for (let n = 0; n < player.hand.length; n++) {
          player.hand[n].separate(player.hand.length, n + 1);
        }
        break;
      }
    }
    window.requestAnimationFrame(GameGUI.draw);
  } else if (event.message.startsWith("Tokn")) {
    let data = event.message.slice(4).split(";");
    let pNum = parseInt(data[1]);
    if (data[0] == "P") {
      let tokenNum = parseInt(data[2]);
      if (tokenNum == 0) {
        let suit = data[3];
        let num = data[4];
        let newCard = new Card(suit, num);
        newCard.dupe = true;
        newCard.grab(pNum);
        players[pNum].hand.push(newCard);
        for (let i = 0; i < players[pNum].hand.length; i++) {
          players[pNum].hand[i].separate(players[pNum].hand.length, i + 1);
        }
        players[pNum].tokens[0] -= 1;
      } else if (tokenNum == 1) {
        players[pNum].health += 20;
        players[pNum].tokens[1] -= 1;
        players[pNum].health = Math.min(100 + players[pNum].tokens[3] * 10, players[pNum].health);
      } else if (tokenNum == 2) {
        players[pNum].tokens[2] -= 1;
        Player.recycle = [pNum, 0, 0];
      } else if (tokenNum == 3) {
        players[pNum].health += parseInt(data[3]);
        players[pNum].protections[0] = -1;
      }
      if (tokenNum < 3) {
        log("> " + colorsDark[players[pNum].class] + players[pNum].name + "#000000 used a " + tokenNames[tokenNum + 4] + " token");
      }
    } else if (data[0] == "G") {
      if (pNum == hand && Player.tokens.length > 0) {
        Player.tokens = [];
        GameGUI.screen = 2;
      }
      token(players[pNum], data[2]);
    }
    window.requestAnimationFrame(GameGUI.draw);
  } else if (event.message.startsWith("Shfl")) {
    Deck.deck = [];
    let lisDeck = event.message.split(";;")[0].slice(4).split(";").map(x => x.split(","));
    for (let i = 0; i < lisDeck.length; i++) {
      Deck.deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
    }
    Deck.played = [[], []];
    Player.clickCard = null;
    Player.clickBig = false;
    for (let i = 0; i < 3; i++) {
      let card = Deck.deck.pop();
      Deck.played[1].push(card);
      card.image.src = "./images/tapp/" + card.card[0] + card.card[1] + ".webp";
    }

    let speeds = [...players];
    speeds.sort(function(a, b) {
      return a.health == b.health ? b.speed - a.speed : b.health - a.health;
    });
    for (let i = 0; i < speeds.length; i++) {
      speeds[i].pos = i;
    }

    for (let i = 0; i < players.length; i++) {
      let player = players[i];
      player.health = 100 + player.tokens[3] * 10;
      player.life -= player.pos * 2;
      if (player.id == hand) {
        if (player.pos == 0) {
          for (let n = 0; n < players.length; n++) {
            Deck.deck[n].image.src = "./images/tapp/" + Deck.deck[n].card[0] + Deck.deck[n].card[1] + ".webp";
          }
        }
      }
      if (player.ability == "Overconfidence") {
        if (player.life < 5 && player.life + player.pos * 2 > 4) {
          player.attack -= 2;
          player.armor += 2;
        }
      }
      if (player.protections.includes("JK1")) {
        player.attack -= 2;
      }
      if (player.ability == "Castle Armory") {
        player.armor += 1;
      }
      if (player.protections.includes("MC3")) {
        player.attack -= 1;
        player.armor -= 1;
        player.speed -= 20;
      }
      if (player.protections.includes("WC1")) {
        player.armor -= 4;
      }
      while (player.protections.includes("ES")) {
        player.attack -= 5;
        player.protections.splice(player.protections.indexOf("ES"), 1);
      }
      player.protections.some(item => { if (item.includes("WC2")) {
        player.armor += parseInt(item.slice(3));
      }});
      player.protections.some(item => { if (item.includes("RR2")) {
        player.armor -= parseInt(item.slice(3));
      }});
      player.protections = [];
      if (player.ability == "Nimble Feet") {
        player.protections.push(0);
      }
    }
    log("The deck was reshuffled!");
    if (players[hand].class != "Knight") {
      Player.tokens = event.message.split(";;")[1].split(";")[hand].split(",");
      GameGUI.screen = 1;
    } else {
      GameGUI.screen = 2;
    }
    for (let i = 0; i < players.length; i++) {
      if (players[i].class == "Knight") {
        token(players[i], event.message.split(";;")[1].split(";")[i].split(",")[0]);
      }
    }
    window.requestAnimationFrame(GameGUI.draw);
  } else if (event.message.startsWith("Bnty")) {
    let data = event.message.slice(4).split(";");
    let pNum = parseInt(data[0]);
    let bCard = parseInt(data[1]);
    let pos = parseInt(data[2]);
    Deck.deck[bCard].grab(pNum);
    players[pNum].hand.push(Deck.deck[bCard]);
    for (let i = 0; i < players[pNum].hand.length; i++) {
      players[pNum].hand[i].separate(players[pNum].hand.length, i + 1);
    }
    Deck.deck[bCard] = null;

    if (pos == players[hand].pos - 1) {
      for (let n = 0; n < players.length; n++) {
        if (Deck.deck[n] != null) {
          Deck.deck[n].image.src = "./images/tapp/" + Deck.deck[n].card[0] + Deck.deck[n].card[1] + ".webp";
        }
      }
    }
    if (pos == players[hand].pos) {
      for (let n = 0; n < players.length; n++) {
        if (Deck.deck[n] != null) {
          Deck.deck[n].image.src = "./images/back.webp";
        }
      }
    }
    if (pos == players.length - 1) {
      let speeds = [...players];
      speeds.sort(function(a, b) {
        return b.speed - a.speed;
      });
      for (let i = 0; i < speeds.length; i++) {
        speeds[i].pos = i;
      }

      if (hand > -1) {
        Player.target = players[hand].pos;
        Player.nextTarget();
      }
      Deck.deck.splice(0, players.length);
      GameGUI.screen = 0;
    }
    window.requestAnimationFrame(GameGUI.draw);
  } else if (event.message.startsWith("Leve")) {
    let h = event.message.slice(4);
    for (let i = 0; i < players.length; i++) {
      if (players[i].uuid == h) {
        let player = players[i];
        player.online = false;
        player.uuid = null;
        log(player.name + " left the game. (" + Player.count(true) + "/" + players.length + ")");
        break;
      }
    }
  }
};

function setUpGame(data) {
  data = data.split(";;");
  let strDeck = data[0];
  for (let i = 1; i <= parseInt(data[1]); i++) {
    players.push(new Player(i - 1, "Player " + i));
  }
  let lisDeck = data[0].split(";").map(function(x) {
    return x.split(",");
  });
  for (let i = 0; i < lisDeck.length; i++) {
    Deck.deck.push(new Card(lisDeck[i][0], lisDeck[i][1]));
  }
  for (let i = 0; i < 3; i++) {
    let card = Deck.deck.pop();
    Deck.played[1].push(card);
    card.image.src = "./images/tapp/" + card.card[0] + card.card[1] + ".webp";
  }
}

class MainGUI {

  static tempGameId = "";

  static start() {
    window.onresize = function() {
      window.requestAnimationFrame(MainGUI.draw);
      resize();
    };
    MainGUI.toggleListeners(true);
    Deck.selected.src = "./images/selected.webp";
    Deck.deckImg.src = "./images/deck.webp";
    Deck.blankImg.src = "./images/blank.webp";
    resize();
    window.requestAnimationFrame(MainGUI.draw);
  }

  static click(event) {
    if (width * 0.4 < event.offsetX && event.offsetX < width * 0.6) {
      if (height * 41 / 66 < event.offsetY && event.offsetY < height * 47 / 66) {
        MainGUI.toggleListeners(false);
        document.getElementById("mainInput").remove();
        CreateGUI.start();
      }
    }
  }

  static keydown(event) {
    if (event.key == "Backspace") {
      MainGUI.tempGameId = MainGUI.tempGameId.slice(0, -1);
    } else if (!isNaN(event.key)) {
      MainGUI.tempGameId += event.key;
      if (MainGUI.tempGameId.length > 4) {
        MainGUI.tempGameId = MainGUI.tempGameId.slice(1);
      }
    } else if (event.key == "Enter" && MainGUI.tempGameId.length > 2) {
      MainGUI.toggleListeners(false);
      document.getElementById("mainInput").remove();
      pubnub.subscribe({
        channels: ["TP" + MainGUI.tempGameId, "TP-JL" + MainGUI.tempGameId],
        withPresence: true
      });
      return;
    }
    document.getElementById("mainInput").value = "";
    window.requestAnimationFrame(MainGUI.draw);
  }

  static draw() {
    rect(width / 2, height / 2, width, height, "#64c8dc");
    rect(width / 2, height / 1.8, width / 4, height / 9);
    rect(width / 2, height / 1.5, width / 5, height / 11);
    text("TAPP", width / 2, height / 6, fontSize / 6);
    text("Game ID:", width / 2, height / 2.3, fontSize / 17);
    text(MainGUI.tempGameId, width / 2, height / 1.8, fontSize / 17);
    text("Create Game", width / 2, height / 1.5, fontSize / 20);
  }

  static toggleListeners(listen) {
    if (listen) {
      canvas.addEventListener("click", MainGUI.click);
      window.addEventListener("keydown", MainGUI.keydown);
    } else {
      canvas.removeEventListener("click", MainGUI.click);
      window.removeEventListener("keydown", MainGUI.keydown);
    }
  }

}

class CreateGUI {

  static incantations = true;
  static players = 2;

  static start() {
    window.onresize = function() {
      resize();
      window.requestAnimationFrame(CreateGUI.draw);
    };
    CreateGUI.toggleListeners(true);
    let input = document.createElement("input");
    input.id = "createInput";
    input.type = "number";
    document.getElementById("canvasWrap").appendChild(input);
    window.requestAnimationFrame(CreateGUI.draw);
  }

  static click(event) {
    if (between(event.offsetX, width * 0.3, width * 0.2)) {
      if (between(event.offsetY, height * 0.45, height * 0.1)) {
        CreateGUI.incantations = !CreateGUI.incantations;
        window.requestAnimationFrame(CreateGUI.draw);
      }
    }
    if (between(event.offsetX, width * 0.3, width / 4)) {
      if (between(event.offsetY, height * 0.7875, height / 8)) {
        CreateGUI.toggleListeners(false);
        document.getElementById("createInput").remove();
        Deck.makeDeck();
      }
    }
  }

  static keydown(event) {
    if (parseInt(event.key) > 1 && parseInt(event.key) < 6) {
      CreateGUI.players = parseInt(event.key);
    }
    document.getElementById("createInput").value = "";
    window.requestAnimationFrame(CreateGUI.draw);
  }

  static draw() {
    rect(width / 2, height / 2, width, height, "#64c8dc");
    rect(width / 2, height / 2, width * 0.8, height * 0.8, "#c8f0ff");
    rect(width * 0.7, height / 2, width * 0.35, height * 0.7);
    rect(width * 0.3, height * 0.7875, width / 4, height / 8);
    text("How to Play", width * 0.7, height * 0.25, fontSize / 10);
    text("Be the last person with Life Points\nby battling and eliminating your\nopponents!", width * 0.7, height * 0.45, fontSize / 16);
    text("TAPP", width * 0.3, height / 5, fontSize / 8);
    text("Start", width * 0.3, height * 0.7875, fontSize / 14);
    text("Players: " + CreateGUI.players, width * 0.3, height * 0.35, fontSize / 14);
    if (CreateGUI.incantations) {
      text("Incantations: On", width * 0.3, height * 0.45, fontSize / 14);
    } else {
      text("Incantations: Off", width * 0.3, height * 0.45, fontSize / 14);
    }
  }

  static toggleListeners(listen) {
    if (listen) {
      canvas.addEventListener("click", CreateGUI.click);
      window.addEventListener("keydown", CreateGUI.keydown);
    } else {
      canvas.removeEventListener("click", CreateGUI.click);
      window.removeEventListener("keydown", CreateGUI.keydown);
    }
  }

}

class ClassGUI {

  static start() {
    window.onresize = function() {
      resize();
      window.requestAnimationFrame(ClassGUI.draw);
    };
    ClassGUI.toggleListeners(true);
    window.requestAnimationFrame(ClassGUI.draw);
  }

  static click(event) {
    if (between(event.offsetX, width / 5, width / 6)) {
      for (let i = 0; i < 4; i++) {
        if (between(event.offsetY, height * (0.319 + i * 0.134), height * 0.12)) {
          players[hand].ability = "Empowered Strikes";
          players[hand].class = i;
        }
      }
    }
    if (between(event.offsetX, width * 0.4, width / 7)) {
      for (let i = 2; i >= -2; i--) {
        if (between(event.offsetY, height * (0.52 - i * 8 / 75), height * 0.09)) {
          players[hand].attack = i;
        }
      }
    }
    if (between(event.offsetX, width * 0.7, width * 0.37)) {
      for (let i = 0; i < 3; i++) {
        if (between(event.offsetY, height * (0.34 + i * 0.18), height * 0.17)) {
          if (i == 2) {
            players[hand].ability = "Empowered Strikes";
          } else {
            players[hand].ability = abilities[players[hand].class][i].split(":")[0];
          }
        }
      }
    }
    if (between(event.offsetX, width * 0.775, width / 4)) {
      if (between(event.offsetY, height * 0.86, height / 10)) {
        ClassGUI.toggleListeners(false);
        let p = players[hand];
        p.armor = 2 - p.attack + classBuffs[1][p.class];
        p.speed = 30 - Math.abs(p.attack) * 15 + classBuffs[2][p.class];
        p.attack += classBuffs[0][p.class];
        p.armor += (p.ability == "Castle Armory");
        p.attack += 2 * (p.ability == "Overconfidence");

        let playerStats = "User" + hand + ";" + p.name + ";" + p.class + ";" + p.armor + ";" + p.speed + ";" + p.attack + ";" + p.ability;

        if (p.class == 2) {
          playerStats += ";" + Math.floor(Math.random() * 8);
        }
        if (p.ability == "Hoarding") {
          playerStats += ";" + Math.floor(Math.random() * 4) + ";" + (Math.floor(Math.random() * 4) + 4);
        }
        if (p.ability == "Magical Quiver") {
          playerStats += ";2;" + Player.tempToken;
        }

        send(playerStats);
        
        GameGUI.start();
        return;
      }
    }
    if (between(event.offsetX, width * 0.95, width * 0.09)) {
      for (let i = 0; i < 8; i++) {
        if (between(event.offsetY, height * (0.275 + i * 0.07), height * 0.06)) {
          Player.tempToken = i;
        }
      }
    }
    window.requestAnimationFrame(ClassGUI.draw);
  }

  static keydown(event) {
    if (event.key == "Backspace") {
      players[hand].name = players[hand].name.slice(0, -1);
    } else if (!event.key.match(/[^A-Za-z0-9 ]/) && event.key.length == 1) {
      players[hand].name += event.key;
      if (players[hand].name.length > 10) {
        players[hand].name = players[hand].name.slice(1);
      }
    }
    window.requestAnimationFrame(ClassGUI.draw);
  }

  static draw() {
    let player = players[hand];
    rect(width / 2, height / 2, width, height, "#64c8dc");
    rect(width / 5, height * 0.52, width / 5, height * 0.55, "#c8f0ff");
    rect(width / 5, height * 0.16, width / 5, height * 0.14, "#c8f0ff");
    text("Class", width * 0.2, height * 0.16, fontSize / 15);
    rect(width * 0.4, height * 0.52, width / 6, height * 0.55, "#c8f0ff");
    rect(width * 0.4, height * 0.16, width / 6, height * 0.14, "#c8f0ff");
    text("Attack", width * 0.4, height * 0.16, fontSize / 15);
    rect(width * 0.7, height * 0.52, width / 2.5, height * 0.55, "#c8f0ff");
    rect(width * 0.7, height * 0.16, width / 2.5, height * 0.14, "#c8f0ff");
    text("Ability", width * 0.7, height * 0.16, fontSize / 15);
    for (let i = 0; i < 4; i++) {
      let color = player.class == i ? "#ff0000" : "#000000";
      rect(width / 5, height * (0.319 + i * 0.134), width / 6, height * 0.12, colors[classes[i]]);
      text(classes[i], width / 5, height * (0.319 + i * 0.134), fontSize / 20, color);
    }
    for (let i = 2; i >= -2; i--) {
      let color = player.attack == i ? "#ff0000" : "#000000";
      rect(width * 0.4, height * (0.52 - i * 8 / 75), width / 7, height * 0.09, "#ffffff");
      text(i, width * 0.4, height * (0.52 - i * 8 / 75), fontSize / 20, color);
    }
    let abilityList = [abilities[player.class][0], abilities[player.class][1], abilities[4]];
    for (let i = 0; i < 3; i++) {
      let color = abilityList[i].includes(player.ability) ? "#ff0000" : "#000000";
      rect(width * 0.7, height * (0.34 + i * 0.18), width * 0.37, height * 0.17, "#ffffff");
      text(abilityList[i], width * 0.7, height * (0.34 + i * 0.18), fontSize / 20, color);
    }
    if (player.ability == "Magical Quiver") {
      rect(width * 0.95, height * 0.195, width * 0.09, height * 0.07, "#c8f0ff");
      text("Bonus", width * 0.95, height * 0.195);
      for (let i = 0; i < 8; i++) {
        let color = Player.tempToken == i ? "#ff0000" : "#000000";
        rect(width * 0.95, height * (0.275 + i * 0.07), width * 0.09, height * 0.06);
        text(tokenNames[i], width * 0.95, height * (0.275 + i * 0.07), fontSize / 25, color);
      }
    }
    let armor = 2 - player.attack + classBuffs[1][player.class];
    let speed = 30 - Math.abs(player.attack) * 15 + classBuffs[2][player.class];
    let dmg = player.attack + classBuffs[0][player.class];
    rect(width * 0.2, height * 0.86, width * 0.2, height * 0.1, "#c8f0ff");
    rect(width * 0.475, height * 0.86, width * 0.34, height * 0.1, "#c8f0ff");
    rect(width * 0.775, height * 0.86, width * 0.25, height * 0.1, "#ffffff");
    text("Damage: " + dmg, width * 0.39, height * 0.86, fontSize / 20);
    text("Armor: " + armor, width * 0.475, height * 0.86);
    text("Speed: " + speed, width * 0.56, height * 0.86);
    text("Game ID: " + gameId, width * 0.2, height * 0.86);
    text("Continue as " + player.name, width * 0.775, height * 0.86);
  }

  static toggleListeners(listen) {
    if (listen) {
      canvas.addEventListener("click", ClassGUI.click);
      window.addEventListener("keydown", ClassGUI.keydown);
    } else {
      canvas.removeEventListener("click", ClassGUI.click);
      window.removeEventListener("keydown", ClassGUI.keydown);
    }
  }

}

class GameGUI {

  static screen = -1;

  static start() {
    window.onresize = function() {
      let cards = Deck.deck.concat(Deck.played[0]);
      for (let i = 0; i < players.length; i++) {
        cards = cards.concat(players[i].hand);
      }
      for (let i = 0; i < cards.length; i++) {
        if (cards[i] != null) {
          cards[i].x *= Math.round(canvas.getBoundingClientRect().width / 4) / width;
          cards[i].y *= Math.round(canvas.getBoundingClientRect().height / 4) / height;
          if (cards[i].side % 2 == 0) {
            cards[i].offset *= Math.round(canvas.getBoundingClientRect().height / 4) / height;
          } else {
            cards[i].offset *= Math.round(canvas.getBoundingClientRect().width / 4) / width;
          }
        }
      }
      resize();
      window.requestAnimationFrame(GameGUI.draw);
    };
    GameGUI.screen = 0;
    for (let i = 0; i < players.length; i++) {
      for (let n = 0; n < 5; n++) {
        let card = Deck.deck.pop();
        card.grab(i);
        players[i].hand.push(card);
      }
      for (let n = 0; n < players[i].hand.length; n++) {
        players[i].hand[n].separate(players[i].hand.length, n + 1);
      }
    }
    GameGUI.toggleListeners(true);
    window.requestAnimationFrame(GameGUI.draw);
    for (let i = 0; i < players.length; i++) {
      let pHand = players[i].hand;
      if (pHand.length > 0) {
        let labelX = pHand[0].x;
        let labelY = pHand[0].y;
        if (pHand[0].side % 2 == 0) {
          labelY += height / 6; // below vertical hands
        } else {
        labelX += width / 10; // to the right of horizontal hands
        }
      text(players[i].name, labelX, labelY, fontSize / 25, "#000000");
      }
    }
  }

  static click(event) {
    
    if (Player.clickBig) {
      Player.clickBig = false;
      Player.clickCard2 = null;
      Player.clickCard = null;
    }
    if (Player.clickPlayer != null) {
      Player.clickPlayer = null;
    }
    for (let i = 0; i < players.length; i++) {
      if (players[i].hand.length > 0 && i != hand) {
        let pHand = players[i].hand;
        let cX, cY, cW, cH;
        if (pHand[0].side % 2 == 0) {
          cY = pHand[0].offset;
          cX = pHand[0].x;
          cW = width / 9;
          if (pHand.length > 8) {
            cH = (pHand.length - 1) * height / 2 / pHand.length + height / 4.5;
          } else {
            cH = (pHand.length - 1) * height / 16 + height / 4.5;
          }
        } else {
          cX = pHand[0].offset;
          cY = pHand[0].y;
          cH = height / 4.5;
          if (pHand.length > 8) {
            cW = (pHand.length - 1) * width / 2 / pHand.length + width / 9;
          } else {
            cW = (pHand.length - 1) * width / 16 + width / 9;
          }
        }
        if (between(event.offsetX, cX, cW)) {
          if (between(event.offsetY, cY, cH)) {
            let clickCard = Player.clickCard != null ? Player.clickCard.card[0] + Player.clickCard.card[1] : null;
            if (clickCard == "MR2") {
              for (let i = 0; i < Deck.played[0].length; i++) {
                if (Deck.played[0][i].card[0] + Deck.played[0][i].card[1] != "MR2" && !Deck.played[0][i].skip) {
                  clickCard = Deck.played[0][i].card[0] + Deck.played[0][i].card[1];
                  break;
                }
              }
            }
            if (clickCard == "SE1" && Player.recycle[0] == -1) {
              if (hand !== currentTurn) {
                log("#000000It's not your turn " + players[currentTurn].name + "!");
                return;
              }
              send("Play" + hand + ";" + Player.clickCard.card[0] + Player.clickCard.card[1] + ";" + Player.targetId() + ";" + i);
              currentTurn = (currentTurn + 1) % players.length;
              log("#000000It's now " + players[currentTurn].name + "'s turn!");
              Player.nextTarget();
            } else {
              Player.clickPlayer = players[i];
            }
          }
        }
      }
      if (between(event.offsetX, 7 * width / 8, width / 4)) {
        if (between(event.offsetY, height / 15 * (i + 2), height / 15)) {
          let clickCard = Player.clickCard != null ? Player.clickCard.card[0] + Player.clickCard.card[1] : null;
          if (clickCard == "MR2") {
            for (let i = 0; i < Deck.played[0].length; i++) {
              if (Deck.played[0][i].card[0] + Deck.played[0][i].card[1] != "MR2" && !Deck.played[0][i].skip) {
                clickCard = Deck.played[0][i].card[0] + Deck.played[0][i].card[1];
                break;
              }
            }
          }
          if (clickCard == "SE1" && Player.recycle[0] == -1) {
            if (hand !== currentTurn) {
              log("#000000It's not your turn " + players[currentTurn].name + "!");
              return;
            }
            else {
              send("Play" + hand + ";" + Player.clickCard.card[0] + Player.clickCard.card[1] + ";" + Player.targetId() + ";" + i);
              currentTurn = (currentTurn + 1) % players.length;
              log("#000000It's now " + players[currentTurn].name + "'s turn!");
              Player.nextTarget();
            }
          } else {
            Player.clickPlayer = players[i];
          }
        }
      }
    }
    if (Player.count(false) != players.length) {
      return;
    }
    if (Player.recycle[0] > -1 && Player.recycle[0] != hand) {
      log(colorsDark[players[Player.recycle[0]].class] + players[Player.recycle[0]].name + " #000000is using a Recycle Token.");
      return;
    }
    if (GameGUI.screen == 1) {
      for (let i = 0; i < 3; i++) {
        if (between(event.offsetX, width * 0.45, width * 0.3)) {
          if (between(event.offsetY, height * (0.35 + i * 0.15), height * 0.125)) {
            send("ToknG;" + hand + ";" + Player.tokens[i]);
          }
        }
      }
      return;
    }
    if (GameGUI.screen == 2) {
      let nullCount = 0;
      for (let i = 0; i < players.length; i++) {
        if (Deck.deck[i] == null) {
          nullCount++;
        }
      }
      for (let i = 0; i < players.length; i++) {
        if (between(event.offsetX, width * ((2 * i - players.length + 6.625) / 15), width / 8)) {
          if (between(event.offsetY, height / 2, height / 4)) {
            if (nullCount == players[hand].pos) {
              send("Bnty" + hand + ";" + i + ";" + players[hand].pos);
            }
          }
        }
      }
      return;
    }
    [Player.clickCard].concat([...players[hand].hand].reverse()).some(card => {
      if (card != null && between(event.offsetX, card.x, width / 8) && between(event.offsetY, card.y, height / 4)) {
        if (Player.clickCard != card) {
          Player.clickCard = card;
          if (event.type == "contextmenu") {
            Player.clickBig = true;
          }
        } else {
          Player.clickCard = null;
          Player.clickBig = false;
        }
        return true;
      }
    });
    if (between(event.offsetX, 59 * width / 64, 3 * width / 32)) {
      for (let i = 0; i < 3; i++) {
        if (between(event.offsetY, height * (7 + i) / 15 + fontSize / 80, fontSize / 20)) {
          if (players[hand].tokens[i] > 0) {
            Player.clickToken = Player.clickToken == i ? null : i;
          }
        }
      }
    }
    if (between(event.offsetX, 7 * width / 8, width / 6)) {
      if (between(event.offsetY, 5 * height / 6, height / 12)) {
        if (Player.recycle[0] > -1) {
          log("#000000You may not play while using a Recycle Token!");
        } else if (Player.clickToken == 1 || Player.clickToken == 2) {
          send("ToknP;" + hand + ";" + Player.clickToken);
          Player.clickToken = null;
        } else if (Player.clickToken == 0) {
          if (Player.clickCard.card[0] + Player.clickCard.card[1] != "JJ1") {
            send("ToknP;" + hand + ";" + Player.clickToken + ";" + Player.clickCard.card[0] + ";" + Player.clickCard.card[1]);
            Player.clickToken = null;
          }
        } else if (Player.clickCard == null && players[hand].ability == "Nimble Feet" && players[hand].protections[0] > 0) {
          send("ToknP;" + hand + ";3;" + players[hand].protections[0]);
        } else if (Player.clickCard != null) {
          let clickCard = Player.clickCard.card[0] + Player.clickCard.card[1];
          if (clickCard == "MR2") {
            for (let i = 0; i < Deck.played[0].length; i++) {
              if (Deck.played[0][i].card[0] + Deck.played[0][i].card[1] != "MR2" && !Deck.played[0][i].skip) {
                clickCard = Deck.played[0][i].card[0] + Deck.played[0][i].card[1];
                break;
              }
            }
          }
          let vars = getVars(Player.clickCard, hand, Player.targetId());
          if (clickCard == "MC2") {
            if (between(event.offsetX, 551 * width / 600, width * 0.08)) {
              vars = "E";
            }
          } else if (clickCard == "SE1") {
            return;
          }
          if (hand !== currentTurn) {
            log("#000000It's not your turn " + players[currentTurn].name + "!");
            return;
          }
          send("Play" + hand + ";" + Player.clickCard.card[0] + Player.clickCard.card[1] + ";" + Player.targetId() + ";" + vars);
          currentTurn = (currentTurn + 1) % players.length;
          log("#000000It's now " + players[currentTurn].name + "'s turn!");
          Player.nextTarget();
        }
      }
    }
    if (between(event.offsetX, 7 * width / 8, width / 6)) {
      if (between(event.offsetY, 5 * height / 7, height / 12)) {
        if (Player.clickCard == null) {
          for (let i = 0; i < players.length; i++) {
            if (players[i].hand.length > 3) {
              log("#000000All players must have at most three cards to reshuffle!");
              return;
            }
          }
          Deck.deck = Deck.shuffle(Deck.played[0].concat(Deck.played[1]).concat(Deck.deck));
          let message = "Shfl";
          for (let i = 0; i < Deck.deck.length; i++) {
            if (Deck.deck[i] != null && !Deck.deck[i].dupe) {
              message += Deck.deck[i].card[0] + "," + Deck.deck[i].card[1] + ";";
            }
          }
          for (let i = 0; i < players.length; i++) {
            let randTokens = [];
            while (randTokens.length < 3) {
              let r = Math.floor(Math.random() * 8);
              if (randTokens.indexOf(r) == -1) {
                randTokens.push(r);
              }
            }
            message += ";" + randTokens[0] + "," + randTokens[1] + "," + randTokens[2];
          }
          send(message);
        } else {
          if (Player.recycle[0] > -1 && Player.recycle[1] >= 3) {
            log("#000000You may only discard up to three with a Recycle Token!");
          } else if (Player.recycle[0] > -1 && Player.recycle[2] > 0) {
            log("#000000You may not discard after drawing while using a Recycle Token!");
          } else {
            send("Play" + hand + ";" + Player.clickCard.card[0] + Player.clickCard.card[1] + ";D;");
          }
        }
      }
    }
    if (between(event.offsetX, 11 * width / 36, width / 9)) {
      if (between(event.offsetY, 13 * height / 36, 2 * height / 9)) {
        if (players[hand].hand.length < 5) {
          send("Grab" + hand + ";" + 0);
        } else {
          log("#000000Your hand is full!");
        }
      }
    }
    for (let i = 1; i < 4; i++) {
      if (between(event.offsetX, width * (i + 1) / 8, width / 9)) {
        if (between(event.offsetY, 343 * height / 576, 2 * height / 9)) {
          if (event.type == "contextmenu") {
            Player.clickBig = true;
            Player.clickCard2 = Deck.played[1][i - 1];
          } else if (players[hand].hand.length < 5) {
            send("Grab" + hand + ";" + i);
          } else {
            log("#000000Your hand is full!");
          }
        }
      }
    }
    if (event.type == "contextmenu" && Deck.played[0].length > 0) {
      if (between(event.offsetX, 4 * width / 9, width / 9)) {
        if (between(event.offsetY, 13 * height / 36, height / 4.5)) {
          Player.clickBig = true;
          Player.clickCard2 = Deck.played[0][0];
        }
      }
    }
    window.requestAnimationFrame(GameGUI.draw);
  }

  static keydown(event) {
    if (event.key == " ") {
      if (Player.clickBig) {
        Player.clickBig = false;
      } else if (Player.clickCard != null) {
        Player.clickBig = true;
      }
      window.requestAnimationFrame(GameGUI.draw);
    }
  }

  static draw() {
    if (GameGUI.screen == -1) {
      return;
    }
    rect(width / 2, height / 2, width, height, "#dcdcdc");
    GameGUI.drawInfo();
    for (let i = 0; i < players.length; i++) {
      let pHand = players[i].hand;
      if (i == hand) {
        for (let j = 0; j < pHand.length; j++) {
          ctx.drawImage(pHand[j].image, pHand[j].x - width / 16, pHand[j].y - height / 8, width / 8, height / 4);
        }
      } else {
        for (let j = 0; j < pHand.length; j++) {
          ctx.drawImage(pHand[j].image, pHand[j].x - width / 18, pHand[j].y - height / 9, width / 9, height / 4.5);
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      if (Deck.played[1][i] == null) {
        ctx.drawImage(Deck.blankImg, (14 + i * 9) * width / 72, 31 * height / 64, width / 9, height / 4.5);
      } else {
        ctx.drawImage(Deck.played[1][i].image, (14 + i * 9) * width / 72, 31 * height / 64, width / 9, height / 4.5);
      }
    }
    if (Deck.played[0].length > 0) {
      ctx.drawImage(Deck.played[0][0].image, 7 * width / 18, height / 4, width / 9, height / 4.5);
    } else {
      ctx.drawImage(Deck.blankImg, 7 * width / 18, height / 4, width / 9, height / 4.5);
    }
    if (Deck.deck.length > 0) {
      ctx.drawImage(Deck.deckImg, width / 4, height / 4, width / 9, height / 4.5);
    }
    if (Player.clickCard != null) {
      ctx.drawImage(Deck.selected, Player.clickCard.x - width / 16 - 4, Player.clickCard.y - height / 8 - 4, width / 8 + 8, height / 4 + 8);
      ctx.drawImage(Player.clickCard.image, Player.clickCard.x - width / 16, Player.clickCard.y - height / 8, width / 8, height / 4);
      if (Player.clickBig) {
        ctx.drawImage(Player.clickCard.image, 3 * width / 16, height / 32, 3 * width / 8, 3 * height / 4);
      }
    }
    if (Player.clickCard2 != null) {
      ctx.drawImage(Player.clickCard2.image, 3 * width / 16, height / 32, 3 * width / 8, 3 * height / 4);
    }
    for (let i = 0; i < players.length; i++) {
      let pHand = players[i].hand;
      if (pHand.length > 0) {
        let labelX = pHand[0].x;
        let labelY = pHand[0].y;
        if (pHand[0].side % 2 == 0) {
          labelY += height / 6; // below vertical hands
        } else {
        labelX += width / 10; // to the right of horizontal hands
        }
      text(players[i].name, labelX, labelY, fontSize / 25, "#000000");
      }
    }
    if (GameGUI.screen == 1) {
      rect(3 * width / 8, height / 2, width / 2, height / 2, "#f0f0f0");
      text("Tokens", width * 0.2125, height / 2, fontSize / 8);
      for (let i = 0; i < 3; i++) {
        rect(width * 0.45, height * (0.35 + 0.15 * i), width * 0.3, height / 8, tokenColors[parseInt(Player.tokens[i])]);
        text(tokenNames[parseInt(Player.tokens[i])], width * 0.45, height * (0.35 + 0.15 * i), fontSize / 12);
      }
    } else if (GameGUI.screen == 2) {
      rect(3 * width / 8, 5 * height / 12, width * (2 * players.length + 1) / 15, height / 1.5, "#f0f0f0");
      text("Bounty", 3 * width / 8, 11 * height / 48, fontSize / 8);
      for (let i = 0; i < players.length; i++) {
        if (Deck.deck[i] == null) {
          ctx.drawImage(Deck.blankImg, width * (5 / 16 + (2 * i + 1 - players.length) / 15), 3 * height / 8, width / 8, height / 4);
        } else {
          ctx.drawImage(Deck.deck[i].image, width * (5 / 16 + (2 * i + 1 - players.length) / 15), 3 * height / 8, width / 8, height / 4);
        }
      }
    }
    if (Player.clickPlayer != null) {
      let color;
      if (Player.clickPlayer.class == "Knight") {
        color = "#ffd966";
      } else if (Player.clickPlayer.class == "Archer") {
        color = "#b6d7a8";
      } else if (Player.clickPlayer.class == "Mage") {
        color = "#6fa8dc";
      } else if (Player.clickPlayer.class == "Warlock") {
        color = "#c27ba0";
      }
      rect(3 * width / 8, height / 2, width / 2, height / 2, color);
      text(Player.clickPlayer.name, 3 * width / 8, height * 0.31, fontSize / 12);
      text("Class: " + Player.clickPlayer.class, width / 4, height * 0.6, fontSize / 18);
      text("Life Points: " + Player.clickPlayer.life, width / 2, height * 0.6);
      text("Ability: " + Player.clickPlayer.ability, 3 * width / 8, height * 0.68);
      text("Health: " + Player.clickPlayer.health, 7 * width / 24, height * 0.4);
      text("Attack: " + Player.clickPlayer.attack, 7 * width / 24, height * 0.48);
      text("Armor: " + Player.clickPlayer.armor, 11 * width / 24, height * 0.4);
      text("Speed: " + Player.clickPlayer.speed, 11 * width / 24, height * 0.48);
    }
    
  }

  static drawInfo() {
    rect(7 * width / 8, height / 2, width / 4, height);
    text(gameId, 7 * width / 8, height * 15 / 16, fontSize / 15);
    text("Deck: " + Deck.deck.length + " cards", 7 * width / 8, height / 15 - fontSize / 80, fontSize / 20);
    for (let i = 0; i < players.length; i++) {
      let pInfo = players[i].name + ": " + players[i].health + " health";
      let color = "#000000";
      if (i == hand) {
        color = "#2d7d07";
      } else if (!players[i].ingame) {
        color = "#848484";
      } else if (i == Player.targetId()) {
        color = "#ff4242";
      }
      text(pInfo, 7 * width / 8, height / 15 * (i + 2), fontSize / 20, color);
    }
    text("Attack: " + players[hand].attack, 13 * width / 16, height * 7 / 15 + fontSize / 80);
    text("Armor: " + players[hand].armor, 13 * width / 16, height * 8 / 15 + fontSize / 80);
    text("Speed: " + players[hand].speed, 13 * width / 16, height * 3 / 5 + fontSize / 80);
    let tokenNames = ["Arcane: ", "Mushroom: ", "Recycle: "];
    for (let i = 0; i < 3; i++) {
      let color = Player.clickToken == i ? "#ff0000" : "#000000";
      text(tokenNames[i] + players[hand].tokens[i], 59 * width / 64, height * (7 + i) / 15 + fontSize / 80, fontSize / 20, color);
    }
    let clickCard = Player.clickCard != null ? Player.clickCard.card[0] + Player.clickCard.card[1] : null;
    if (clickCard == "MR2") {
      for (let i = 0; i < Deck.played[0].length; i++) {
        if (Deck.played[0][i].card[0] + Deck.played[0][i].card[1] != "MR2" && !Deck.played[0][i].skip) {
          clickCard = Deck.played[0][i].card[0] + Deck.played[0][i].card[1];
          break;
        }
      }
    }
    if (clickCard == "MC2" && Player.clickToken == null) {
      rect(499 * width / 600, height / 1.2, width * 0.08, height / 12, "#ff2020");
      rect(551 * width / 600, height / 1.2, width * 0.08, height / 12, "#50ff50");
      text("Play", 499 * width / 600, height / 1.2);
      text("Eat", 551 * width / 600, height / 1.2);
    } else {
      if (Player.clickCard == null && Player.clickToken != 1 && Player.clickToken != 2 || Player.clickToken == 0 && clickCard == "JJ1") {
        rect(width * 0.875, height / 1.2, width / 6, height / 12, "#ffc0c0");
      } else {
        rect(width * 0.875, height / 1.2, width / 6, height / 12, "#ff2020");
      }
      if (Player.clickToken != null) {
        text("Use", width * 0.875, height / 1.2);
      } else if (clickCard == "SE1") {
        text("Click a Hand", width * 0.875, height / 1.2);
      } else if (Player.clickCard == null && players[hand].ability == "Nimble Feet" && players[hand].protections[0] > -1) {
        rect(width * 0.875, height / 1.2, width / 6, height / 12, "#ff2020");
        text("Dodge (" + players[hand].protections[0] + ")", width * 0.875, height / 1.2);
      } else {
        text("Play", width * 0.875, height / 1.2);
      }
    }
    rect(width * 0.875, height / 1.4, width / 6, height / 12, "#2020ff");
    if (Player.clickCard == null) {
      text("Reshuffle", width * 0.875, height / 1.4);
    } else {
      text("Discard", width * 0.875, height / 1.4);
    }
  }

  static toggleListeners(listen) {
    if (listen) {
      canvas.addEventListener("contextmenu", GameGUI.click);
      canvas.addEventListener("click", GameGUI.click);
      window.addEventListener("keydown", GameGUI.keydown);
    } else {
      canvas.removeEventListener("contextmenu", GameGUI.click);
      canvas.removeEventListener("click", GameGUI.click);
      window.removeEventListener("keydown", GameGUi.keydown);
    }
  }

}

class Card {

  constructor(suit, num) {
    this.card = [suit, num];
    this.hand = 0;
    this.x = 11 * width / 36;
    this.y = height / 2;
    this.side = 0;
    this.image = new Image();
    this.image.src = "./images/back.webp";
    this.image.onload = function() {
      if (GameGUI.screen > -1) {
        window.requestAnimationFrame(GameGUI.draw);
      }
    };
  }

  grab(newHand) {
    newHand = newHand - hand + 1 + (newHand - hand < 0 ? players.length : 0);

    let cardPos = [[1, 1, 1, 1, 1, 1, 1], [0, 1, 1, 1, 2, 2], [1, 0, 1, 2, 1, 2], [0, 1, 1, 1, 2, 2]];
    let handPos = [[3 * width / 8, 27 * height / 32], [width / 16, height / 2],
                  [3 * width / 8, height / 8], [11 * width / 16, height / 2]];
    let x = 0;
    while (x < newHand) {
      x += cardPos[this.side][players.length - 2];
      this.side += 1;
    }
    let handsOnSide = cardPos[this.side - 1][players.length - 2];
    let handOnSide = newHand - x + handsOnSide;
    this.x = handPos[this.side - 1][0];
    this.y = handPos[this.side - 1][1];
    if (handsOnSide > 1) {
      if (this.side == 2) {
        this.y += ((handsOnSide + 1) / 2 - handOnSide) * height / handsOnSide;
      } else if (this.side == 3) {
        this.x -= ((handsOnSide + 1) / 2 - handOnSide) * width / (handsOnSide + 1);
      } else if (this.side == 4) {
        this.y -= ((handsOnSide + 1) / 2 - handOnSide) * height / handsOnSide;
      }
    }
    if (this.side % 2 == 0) {
      this.offset = this.y;
    } else {
      this.offset = this.x;
    }
    this.hand = newHand;
    if (this.hand == 1) {
      this.image.src = "./images/tapp/" + this.card[0] + this.card[1] + ".webp";
    } else {
      this.image.src = "./images/back.webp";
    }
    window.requestAnimationFrame(GameGUI.draw);
  }

  separate(total, num) {
    if (this.side % 2 == 0) {
      if (total > 8) {
        this.y = this.offset + ((total + 1) / 2 - num) * height / 2 / total;
      } else {
        this.y = this.offset + ((total + 1) / 2 - num) * height / 16;
      }
    } else {
      if (total > 8) {
        this.x = this.offset + ((total + 1) / 2 - num) * width / 2 / total;
      } else {
        this.x = this.offset + ((total + 1) / 2 - num) * width / 16;
      }
    }
  }

  play(player, aim, vars) {
    if (player.id == hand) {
      Player.clickCard = null;
      Player.clickBig = false;
    }
    this.x = 4 * width / 9;
    this.y = height / 2;
    this.image.src = "./images/tapp/" + this.card[0] + this.card[1] + ".webp";
    Deck.played[0].unshift(this);

    if (aim == "D") {
      this.skip = true;
      log(colorsDark[player.class] + player.name + "#000000 discarded a " + cards[this.card[0] + this.card[1]]);
      if (Player.recycle[0] > -1) {
        Player.recycle[1] += 1;
      }
      return;
    }
    if (this.card[0] + this.card[1] == "JJ1") {
      this.skip = true;
    }
    ability(this.card, player, players[aim], vars);
  }

}

class Deck {

  static selected = new Image();
  static deckImg = new Image();
  static blankImg = new Image();

  static deck = [];
  static played = [[], []];

  static shuffle(arr) {
    let curIndex = arr.length, tempValue, randIndex;
    while (0 !== curIndex) {
      randIndex = Math.floor(Math.random() * curIndex);
      curIndex -= 1;
      tempValue = arr[curIndex];
      arr[curIndex] = arr[randIndex];
      arr[randIndex] = tempValue;
    }
    return arr;
  }

  static makeDeck() {
    let lisDeck = [];
    let strDeck = "TP";
    for (let t = 0; t < TYPES.length; t++) {
      for (let r = 0; r < RARTS.length; r++) {
        for (let i = 0; i < parseInt(RARTS[r].slice(0, 1)); i++) {
          lisDeck.push([TYPES[t], RARTS[r].slice(1)]);
        }
      }
    }
    if (CreateGUI.incantations) {
      lisDeck.push(["J", "J1"]);
      lisDeck.push(["J", "J1"]);
    }
    lisDeck = Deck.shuffle(lisDeck);
    for (let i = 0; i < lisDeck.length; i++) {
      strDeck += lisDeck[i][0] + "," + lisDeck[i][1] + ";";
    }
    send(strDeck + ";" + CreateGUI.players, "TP-JL");
  }

}

class Player {

  static target = 0;
  static clickCard = null;
  static clickCard2 = null;
  static clickBig = false;
  static clickPlayer = null;
  static clickToken = null;
  static tempToken = 0;
  static bounty = [];
  static tokens = [];

  static recycle = [-1, 0, 0];

  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.uuid = null;

    this.joined = false;
    this.online = false;
    this.ingame = false;

    this.class = 0;
    this.ability = "Empowered Strikes";
    this.health = 100;
    this.attack = 0;
    this.armor = 0;
    this.speed = 0;
    this.life = 10;

    this.hand = [];
    this.tokens = [0, 0, 0, 0];
    this.protections = [];

    this.pos = 0;
  }

  static count(includeClass) {
    let a = 0;
    for (let i = 0; i < players.length; i++) {
      if (includeClass && players[i].online || !includeClass && players[i].ingame) {
        a++;
      }
    }
    return a;
  }

  static nextTarget() {
    Player.target += 1;
    if (Player.target == players.length) {
      Player.target -= players.length;
    }
    if (Player.target == players[hand].pos) {
      Player.target += 1;
    }
    if (Player.target == players.length) {
      Player.target -= players.length;
    }
  }

  static targetId() {
    for (let i = 0; i < players.length; i++) {
      if (players[i].pos == Player.target) {
        return i;
      }
    }
    return -1;
  }

}

function token(player, num, msg=true) {
  switch (num) {
    case "0":
      player.attack += 1;
      break;
    case "1":
      player.armor += 1;
      break;
    case "2":
      player.speed += 20;
      break;
    case "3":
      player.health += 10;
      player.tokens[3] += 1;
      break;
    case "4":
      player.tokens[0] += 1;
      break;
    case "5":
      player.tokens[1] += 1;
      break;
    case "6":
      player.tokens[2] += 1;
      break;
    case "7":
      player.life += 1;
      break;
  }
  if (msg) {
    log("> " + colorsDark[player.class] + player.name + "#000000 gained a " + tokenNames[num] + " token");
  }
}

function getVars(card, player, aim) {
  let vars = "";
  let cardID = card.card[0] + card.card[1];
  if (cardID == "MR2") {
    for (let i = 0; i < Deck.played[0].length; i++) {
      cardID = Deck.played[0][i].card[0] + Deck.played[0][i].card[1];
      if (cardID != "MR2" && !Deck.played[0][i].skip) {
        break;
      }
    }
  }
  if (cardID == "MM1") {
    vars = Math.floor(Math.random() * (players[aim].hand.length));
  } else if (cardID == "ME1") {
    let cHands = [];
    for (let i = 0; i < players.length; i++) {
      cHands.push(players[i].hand.slice());
    }
    cHands[player].splice(cHands[player].indexOf(card), 1);
    let orbs = [player];
    for (let i = 0; i < cHands.length; i++) {
      cHands[i].forEach(function(c) {
        if (c.card[0] + c.card[1] == "JJ1") {
          cHands[i].splice(cHands[i].indexOf(c), 1);
        }
      });
    }
    for (let t = 0; t < orbs.length; t++) {
      for (let i = 0; i < players.length; i++) {
        if (cHands[i].length > 0 && i != orbs[t]) {
          let nCard = cHands[i][Math.floor(Math.random() * (cHands[i].length))];
          let cardID = nCard.card[0] + nCard.card[1];
          if (["ME1", "MR2"].includes(cardID)) {
            vars += i + "," + cardID + ",;";
            orbs.push(i);
          } else {
            let cVars = getVars(new Card(nCard.card[0], nCard.card[1]), i, i);
            if (nCard.card[0] + nCard.card[1] == "MC2") {
              cVars = "E";
            } else if (cardID == "SE1") {
              cVars = orbs[t];
            }
            vars += i + "," + cardID + "," + cVars + ";";
          }
          cHands[i].splice(cHands[i].indexOf(nCard), 1);
        }
      }
    }
  } else if (cardID == "JJ1") {
    if (players[player].class == "Mage") {
      vars = Math.floor(Math.random() * 4) + ";" + (4 + Math.floor(Math.random() * 4));
    }
  }
  return vars;
}

function ability(card, player, aim, vars="", silent=false) {
  if (!silent) {
    if (player == aim) {
      log("> " + colorsDark[player.class] + player.name + "#000000 hit themself with " + cards[card[0] + card[1]]);
    } else if (card[0] + card[1] == "MC2" && vars == "E") {
      log(colorsDark[player.class] + player.name + "#000000 ate their Mushroom on a Stick");
    } else if (card[0] + card[1] == "JJ1") {
      log(colorsDark[player.class] + player.name + "#000000 used " + incantationNames[classes.indexOf(player.class)]);
    } else {
      log(colorsDark[player.class] + player.name + "#000000 hit " + colorsDark[aim.class] + aim.name + "#000000 with " + cards[card[0] + card[1]]);
    }
  }

  if (card[0] == "M") {
    if (card[1] == "C1") {
      dmg(9 + (checkBarrier(aim) ? 0 : aim.armor), player, aim, card, true);
    } else if (card[1] == "C2") {
      if (vars == "E") {
        player.health += 10;
      } else {
        dmg(12, player, aim, card, true);
      }
    } else if (card[1] == "C3") {
      dmg(9, player, aim, card, true);
      player.attack += 1;
      player.armor += 1;
      player.speed += 20;
      player.protections.push("MC3");
    } else if (card[1] == "R1") {
      dmg(12, player, aim, card, true);
      player.protections.push("MR1");
    } else if (card[1] == "R2") {
      let last;
      let found = false;
      for (let i = 1; i < Deck.played[0].length; i++) {
        last = [Deck.played[0][i].card[0] + Deck.played[0][i].card[1], i];
        if (last[0] != "MR2" && !Deck.played[0][i].skip) {
          found = true;
          break;
        }
      }
      if (!found) {
        dmg(11, player, aim, card, true);
        return;
      }
      if (vars != "E") {
        dmg(11, player, aim, card, true);
      }
      if (last[0] == "MC1") {
        if (!checkBarrier(aim)) {
          aim.health -= aim.armor;
        }
      } else if (last[0] == "ME1") {
        ability([last[0].slice(0, 1), last[0].slice(1)], player, aim, vars, true);
      } else if (last[0] == "WC2") {
        if (!checkBarrier(aim)) {
          aim.protections.push("WC2" + aim.armor);
          aim.armor = 0;
          if (aim.ability == "Royal Aura") {
            aim.health -= aim.armor;
          }
        }
      } else if (last[0] == "WR2") {
        if (!checkBarrier(aim)) {
          aim.health -= 2 * Math.floor(player.armor / 2);
        }
      } else if (last[0] == "WE1") {
        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (p != player) {
            if (!checkBarrier(p)) {
              p.health -= 5 + Math.floor(player.armor / 2);
            }
          }
        }
      } else if (last[0] == "RC1") {
        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (p != aim && p.speed < player.speed) {
            if (!checkBarrier(p)) {
              dmg(11, player, p, card, true);
            }
          }
        }
      } else if (last[0] == "RC2") {
        if (!checkBarrier(aim)) {
          aim.health -= Math.floor(player.speed / 15);
        }
      } else if (last[0] == "RC3") {
        if (!checkBarrier(aim)) {
          aim.health -= 11 + player.attack + (player.class == "Mage" ? 2 : 0);
        }
      } else if (last[0] == "RE1") {
        if (!checkBarrier(aim)) {
          if (aim.ability == "Royal Aura") {
            aim.health -= aim.armor;
          }
          for (let i = 0; i < Math.floor(player.speed / 30) + 1; i++) {
            aim.health -= 11 + player.attack + (player.class == "Mage" ? 2 : 0);
          }
        }
      } else if (last[0] == "RM1") {
        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (p != player) {
            if (!checkBarrier(p)) {
              p.health -= 2 + Math.floor(player.speed / 10);
            }
          }
        }
      } else if (last[0] == "SC2") {
        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (p != player) {
            if (!checkBarrier(p)) {
              dmg(3, player, p, card, true);
            }
          }
        }
      } else if (last[0] == "SR1") {
        let total = 11 + player.attack + (player.class == "Mage" ? 2 : 0);
        player.health += Math.floor(total / 2);
      } else if (last[0] == "SR2") {
        if (11 + player.attack + (player.class == "Mage" ? 2 : 0) > 14) {
          for (let i = 0; i < players.length; i++) {
            let p = players[i];
            if (p != player) {
              if (!checkBarrier(p)) {
                dmg(4, player, p, card, true);
              }
            }
          }
        }
      } else if (last[0] == "SE1") {
        if (!checkBarrier(aim)) {
          dmg(11, player, players[parseInt(vars)], card, true);
        }
      } else {
        let targetHP = aim.health;
        ability([last[0].slice(0, 1), last[0].slice(1)], player, aim, vars, true);
        aim.health = targetHP;
      }
    } else if (card[1] == "E1") {
      vars = vars.split(";").slice(0, -1);
      players.some(p => { if (p.protections.includes("SC1")) {
        if (!(checkBarrier(aim) || checkBlock(aim))) {
          aim.health -= 4;
          item.splice(item.indexOf("SC1"), 1);
        }
      }});
      for (let h = 0; h < vars.length; h++) {
        let cVar = vars[h].split(",");
        cVar[0] = players[parseInt(cVar[0])];
        if (checkBarrier(cVar[0])) {
          continue;
        }
        for (let i = 0; i < cVar[0].hand.length; i++) {
          let pCard = cVar[0].hand[i];
          if (cVar[1] == pCard.card[0] + pCard.card[1]) {
            if (cVar[0].id == hand) {
              Player.clickCard = null;
              Player.clickBig = false;
            }
            pCard.x = 4 * width / 9;
            pCard.y = height / 2;
            pCard.image.src = "./images/tapp/" + pCard.card[0] + pCard.card[1] + ".webp";
            Deck.played[0].push(pCard);
            ability(pCard.card, cVar[0], cVar[0], cVar[2]);
            cVar[0].hand.splice(i, 1);
            message(new Object({ message: "Grab" + cVar[0].id + ";0" }));
            break;
          }
        }
      }
    } else if (card[1] == "M1") {
      dmg(17, player, aim, card, true);
      if (aim != player && aim.hand.length > 0 && !checkBarrier(aim)) {
        let steal = parseInt(vars);
        let newCard = new Card(aim.hand[steal].card[0], aim.hand[steal].card[1]);
        newCard.grab(player.id);
        aim.hand.splice(steal, 1);
        player.hand.push(newCard);
        message(new Object({ message: "Grab" + aim.id + ";0" }));
      }
    }
  } else if (card[0] == "W") {
    if (card[1] == "C1") {
      dmg(11, player, aim, card);
      player.armor += 4;
      player.protections.push("WC1");
    } else if (card[1] == "C2") {
      if (!checkBarrier(aim)) {
        aim.protections.push("WC2" + aim.armor);
        aim.armor = 0;
      }
      dmg(12, player, aim, card);
    } else if (card[1] == "C3") {
      dmg(11, player, aim, card);
      player.health += player.armor;
    } else if (card[1] == "R1") {
      dmg(12, player, aim, card);
      player.protections.push("WR1");
    } else if (card[1] == "R2") {
      let extra = checkBarrier(aim) ? 0 : 2 * Math.floor(player.armor / 2);
      dmg(13 + extra, player, aim, card);
    } else if (card[1] == "E1") {
      dmg(7, player, aim, card);
      for (let i = 0; i < players.length; i++) {
        let p = players[i];
        if (p != player) {
          if (!(checkBarrier(p) || checkBlock(p))) {
            p.health -= 5 + Math.floor(p.armor / 2);
            while (p.protections.includes("MR1")) {
              if (!(checkBarrier(player) || checkBlock(player))) {
                for (let n = 0; n < p.hand.length; n++) {
                  if (p.hand[n].card[0] == "M") {
                    player.health -= 3;
                  }
                }
              }
              p.protections.splice(p.protections.indexOf("MR1"), 1);
            }
          }
        }
      }
    } else if (card[1] == "M1") {
      dmg(18, player, aim, card);
      player.health += 10 + player.armor;
    }
  } else if (card[0] == "R") {
    if (card[1] == "C1") {
      dmg(10, player, aim, card);
      for (let i = 0; i < players.length; i++) {
        let p = players[i]
        if (p != aim && p.speed < player.speed) {
          if (!checkBarrier(p)) {
            dmg(10, player, p, card);
          }
        }
      }
    } else if (card[1] == "C2") {
      let extra = checkBarrier(aim) ? 0 : Math.floor(player.speed / 15);
      dmg(11 + extra, player, aim, card);
    } else if (card[1] == "C3") {
      let total = player.attack + (player.class == "Archer" ? 8 : 6);
      dmg(6 + (checkBarrier(aim) ? 0 : total), player, aim, card);
    } else if (card[1] == "R1") {
      dmg(12, player, aim, card);
      player.protections.push("RR1");
    } else if (card[1] == "R2") {
      let bonus = Math.floor(player.speed / 10);
      dmg(12, player, aim, card);
      player.armor += bonus;
      player.protections.push("RR2" + bonus);
    } else if (card[1] == "E1") {
      if (checkBarrier(aim)) {
        dmg(6, player, aim, card);
      } else {
        for (let i = 0; i < Math.floor(Math.max(player.speed, 0) / 30) + 2; i++) {
          dmg(6, player, aim, card, true);
        }
      }
    } else if (card[1] == "M1") {
      dmg(19, player, aim, card);
      for (let i = 0; i < players.length; i++) {
        let p = players[i];
        if (p != player) {
          if (!(checkBarrier(p) || checkBlock(p))) {
            p.health -= 2 + Math.floor(player.speed / 10);
            while (p.protections.includes("MR1")) {
              if (!(checkBarrier(player) || checkBlock(player))) {
                for (let n = 0; n < p.hand.length; n++) {
                  if (p.hand[n].card[0] == "M") {
                    player.health -= 3;
                  }
                }
              }
              p.protections.splice(p.protections.indexOf("MR1"), 1);
            }
          }
        }
      }
    }
  } else if (card[0] == "S") {
    if (card[1] == "C1") {
      dmg(12, player, aim, card);
      player.protections.push("SC1");
    } else if (card[1] == "C2") {
      dmg(11, player, aim, card);
      for (let i = 0; i < players.length; i++) {
        let p = players[i];
        if (p != player) {
          if (!(checkBarrier(p) || checkBlock(p))) {
            p.health -= 3;
            while (p.protections.includes("MR1")) {
              if (!(checkBarrier(player) || checkBlock(player))) {
                for (let n = 0; n < p.hand.length; n++) {
                  if (p.hand[n].card[0] == "M") {
                    player.health -= 3;
                  }
                }
              }
              p.protections.splice(p.protections.indexOf("MR1"), 1);
            }
          }
        }
      }
    } else if (card[1] == "C3") {
      dmg(12, player, aim, card);
      player.protections.push("SC3");
    } else if (card[1] == "R1") {
      let total = 15 + player.attack + (player.class == "Warlock" ? 2 : 0);
      player.health += Math.floor(total / 2);
      dmg(15, player, aim, card);
    } else if (card[1] == "R2") {
      if (14 + player.attack + (player.class == "Warlock" ? 2 : 0) > 14) {
        for (let i = 0; i < players.length; i++) {
          let p = players[i];
          if (p != player) {
            if (!(checkBarrier(p) || checkBlock(p))) {
              p.health -= 4;
            }
          }
        }
      }
      dmg(14, player, aim, card);
    } else if (card[1] == "E1") {
      dmg(8, player, aim, card, true);
      let p = players[parseInt(vars)];
      if (!checkBarrier(p)) {
        dmg(8, player, p, card, true);
        log("> " + colorsDark[player.class] + player.name + "#000000 hit " + colorsDark[p.class] + p.name + "#000000 with Dual Scythes");
      }
    } else if (card[1] == "M1") {
      dmg(22, player, aim, card);
      for (let i = 0; i < players.length; i++) {
        let p = players[i];
        if (p != player) {
          if (!checkBarrier(p)) {
            p.life -= 1;
            if (p.ability == "Overconfidence") {
              if (p.life < 5 && p.life + 1 > 4) {
                p.attack -= 2;
                p.armor += 2;
              }
            }
          }
        }
      }
    }
  } else if (card[0] == "J") {
    if (player.class == "Knight") {
      player.health += 15;
      player.attack += 2;
      player.protections.push("JK1");
    } else if (player.class == "Archer") {
      player.protections.push("JA1");
      player.protections.push("JA1");
    } else if (player.class == "Mage") {
      vars = vars.split(";");
      token(player, parseInt(vars[0]));
      token(player, parseInt(vars[1]));
    } else if (player.class == "Warlock") {
      for (let i = 0; i < players.length; i++) {
        players[i].health = 50;
      }
      player.attack += 1;
    }
  }

  player.health = Math.min(100 + player.tokens[3] * 10, player.health);
  if (classTypes[player.class] == card[0] && player.ability == "Empowered Strikes") {
    player.attack += 5;
    player.protections.push("ES");
  }
  if (!aim.protections.includes("EL")) {
    if (aim.ability == "Enchanted Lifeline" && aim.health <= 0) {
      aim.health = 15;
      aim.health.push("EL");
      log(colorsDark[aim.class] + aim.name + "#000000 Enchanted Lifeline saved them!");
    }
  }
}

function dmg(amt, player, aim, card, dmg=false) {
  if (!checkBlock(aim)) {
    if (aim.ability == "Royal Aura" && card[0] == "M") {
      dmg = false;
    }
    let total = amt - (dmg ? 0 : aim.armor) + player.attack;
    total += classTypes[player.class] == card[0] ? 2 : 0;
    if (aim.protections.includes("RR1") && aim.speed > player.speed) {
      total = Math.floor(total / 2 - (dmg ? 0 : aim.armor) / 2);
    }
    aim.health -= Math.max(total, 0);
    while (player.protections.includes("ES")) {
      player.attack -= 5;
      player.protections.splice(player.protections.indexOf("ES"), 1);
    }
    if (card[0] == "S" && player.ability == "Demonic Essence") {
      let healAmt = amt + player.attack + 2;
      player.health += Math.floor(healAmt / 3);
    }
    if (aim.ability == "Nimble Feet" && aim.protections[0] > -1) {
      aim.protections[0] = Math.max(total, 0);
    }
  }
  if (player.protections.includes("MC3")) {
    player.attack -= 1;
    player.armor -= 1;
    player.speed -= 20;
    player.protections.splice(player.protections.indexOf("MC3"), 1);
  }
  while (aim.protections.includes("MR1")) {
    if (!(checkBarrier(player) || checkBlock(player))) {
      for (let i = 0; i < aim.hand.length; i++) {
        if (aim.hand[i].card[0] == "M") {
          player.health -= 3;
        }
      }
    }
    aim.protections.splice(aim.protections.indexOf("MR1"), 1);
  }
  if (player.protections.includes("WC1")) {
    player.armor -= 4;
    player.protections.splice(player.protections.indexOf("WC1"), 1);
  }
  player.protections.some(item => { if (isNaN(item) && item.includes("WC2")) {
    player.armor += parseInt(item.slice(3));
    player.protections.splice(player.protections.indexOf(item), 1);
  }});
  player.protections.some(item => { if (isNaN(item) && item.includes("RR2")) {
    player.armor -= parseInt(item.slice(3));
    player.protections.splice(player.protections.indexOf(item), 1);
  }});
  players.some(p => { if (p.protections.includes("SC1")) {
    if (!(checkBarrier(player) || checkBlock(player))) {
      player.health -= 4;
      p.protections.splice(p.protections.indexOf("SC1"), 1);
    }
  }});
  if (player.protections.includes("EL")) {
    player.protections.push("ELD");
  }
  if (player.protections.includes("WR1")) {
    player.protections.splice(player.protections.indexOf("WR1"), 1);
  }
  if (player.protections.includes("RR1")) {
    player.protections.splice(player.protections.indexOf("RR1"), 1);
  }
}

function checkBarrier(aim) {
  if (aim.protections.includes("SC3")) {
    aim.protections.splice(aim.protections.indexOf("SC3"), 1);
    log("> " + colorsDark[aim.class] + aim.name + "'s #000000 Soul Barrier blocked the ability!");
    return true;
  } else {
    return false;
  }
}

function checkBlock(aim) {
  if (aim.protections.includes("WR1")) {
    aim.protections.splice(aim.protections.indexOf("WR1"), 1);
    log("> " + colorsDark[aim.class] + aim.name + "'s #000000 Thick Cleaver blocked the attack!");
  } else if (aim.protections.includes("EL") && !aim.protections.includes("ELD")) {
    log("> " + colorsDark[aim.class] + aim.name + "'s #000000 Enchanted Lifeline protected them!");
  } else if (aim.protections.includes("JA1")) {
    aim.protections.splice(aim.protections.indexOf("JA1"), 1);
    log("> " + colorsDark[aim.class] + aim.name + "'s #000000 Super Speed dodged the attack!");
  } else {
    return false;
  }
  return true;
}

let resize = function() {
  width = Math.round(canvas.getBoundingClientRect().width / 4);
  height = Math.round(canvas.getBoundingClientRect().height / 4);
  canvas.width = width * 4;
  canvas.height = height * 4;
  ctx.scale(4, 4);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (width / 2 < height) {
    fontSize = width / 2;
  } else {
    fontSize = height;
  }
};

function rect(x, y, across, up, color="#ffffff") {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - across / 2, y - up / 2, across, up);
  ctx.fillStyle = color;
  ctx.fillRect(x - across / 2 + 3, y - up / 2 + 3, across - 6, up - 6);
}

function text(text, x, y, font=null, color="#000000") {
  if (font != null) {
    ctx.font = font + "px Big Shoulders Display";
  }
  ctx.fillStyle = color;
  text = (text + "").split("\n");
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y + (i - (text.length - 1) / 2) * font);
  }
}

function log(text) {
  let docLog = document.getElementById("log");
  text = text.split("#");
  docLog.innerHTML += text.splice(0, 1);
  for (let i = 0; i < text.length; i += 2) {
    text.splice(i + 1, 0, text[i].slice(6));
    text[i] = text[i].slice(0, 6);
  }
  for (let i = 0; i < text.length; i += 2) {
    docLog.innerHTML += "<font color='" + text[i] + "'>" + text[i + 1] + "</font>";
  }
  docLog.innerHTML += "<br>";
  docLog.scrollTop = docLog.scrollHeight;
}

function between(point, middle, length) {
  return middle - length / 2 < point && point < middle + length / 2;
}

const UUIDGeneratorBrowser = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
  (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

const pubnub = new PubNub({
  publishKey: "pub-c-6d5bcb69-9b5e-4028-8d71-16d663175bc2",
  subscribeKey: "sub-c-0253bc9a-906b-11ec-918e-02d5075437d9",
  uuid: UUIDGeneratorBrowser
});

pubnub.addListener({
  message: function(event) {
    message(event);
  },
  status: function(event) {
    if (!event.error) {
      for (let i = 0; i < event.affectedChannels.length; i++) {
        if (event.affectedChannels[i].includes("-JL")) {
          checkHistory(event.affectedChannels[i], 1);
          gameId = event.affectedChannels[i].slice(5);
        }
      }
    }
  },
  presence: function(event) {
    if (event.action == "leave" && event.subscribedChannel.includes("-JL")) {
      pubnub.publish({
        channel: "TP-JL" + gameId,
        message: "Leve" + event.uuid
      }, function(status, response) {
        if (status.error) {
          console.log(status);
        }
      });
    }

  }
});

async function checkHistory(channel, count = 100, j = 0) {
  let history;
  try {
    history = await pubnub.history({
      channel: channel,
      count: count,
      reverse: true,
      stringifiedTimeToken: true,
    });
  } catch (status) {
    console.log(status);
  }
  for (let i = j; i < history.messages.length; i++) {
    setTimeout(function() {
      message(new Object({ message: history.messages[i].entry }));
    }, 20 * i);
  }

  if (channel.includes("-JL") && j == 1) {
    setTimeout(function() {
      hand = 0;
      for (let i = 0; i < players.length; i++) {
        if (players[i].joined) {
          hand++;
        }
      }
      if (hand == players.length) {
        hand = -1;
        for (let i = 0; i < players.length; i++) {
          if (!players[i].online) {
            hand = i;
            break;
          }
        }
        if (hand == -1) {
          log("#ff0000This game is full! You can no longer join it.");
          return;
        }
      }
      checkHistory("TP" + gameId);
      pubnub.publish({
        channel: "TP-JL" + gameId,
        message: "Join" + hand + ";" + UUIDGeneratorBrowser
      }, function(status, response) {
        if (status.error) {
          console.log(status)
        }
      });
    }, 20 * history.messages.length);
  }

}

async function findUnusedChannel(i, digits) {
  let id = Math.floor(Math.random() * 9 * 10**digits) + 10**digits + "";
  let history;
  try {
    history = await pubnub.history({
      channel: "TP-JL" + id,
      count: 1,
    });
  } catch (status) {
    console.log(status);
  }
  if (history.messages.length > 0) {
    if (i > 10) {
      digits += 1;
      i = -1;
    }
    return findUnusedChannel(i + 1, digits);
  } else {
    gameId = id;
    return id;
  }
}

async function send(message, channel="TP") {
  if (gameId == null) {
    await findUnusedChannel(0, 2);
    pubnub.subscribe({
      channels: ["TP" + gameId, "TP-JL" + gameId],
      withPresence: true
    });
  }

  pubnub.publish({
    channel: channel + gameId,
    message: message
  }, function(status, response) {
    if (status.error) {
      console.log(status);
    }
  });
}

MainGUI.start();

document.onreadystatechange = function() {
  if (document.readyState == "complete") {
    let check = setInterval(function() {
      if (document.fonts.check("1em Big Shoulders Display")) {
        window.dispatchEvent(new Event('resize'));
        clearInterval(check);
      }
    }, 20);
  }
};

canvas.oncontextmenu = function(event) {
  event.preventDefault();
}

window.addEventListener("keydown", function(e) {
  if(e.keyCode == 32 && e.target == document.body) {
    e.preventDefault();
  }
});
