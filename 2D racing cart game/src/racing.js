import Cart from "./Cart.js";
import CrewMember, { ROLES, STATS } from "./CrewMember.js";
export const BaseStats={
    HorseAC:10,
    HorseHP:30,
    CartBaseHP:50,
    CartBaseAC:12,
    CartBaseSpeed:40
};
class CartPart {
    name = "";
    quality = 0;
    constructor(name) {
        this.name = name;
    }
    evaluateRoll(roll) {
        let limit = this.dc.value;
        let increment = this.dc.increment;
        let upgrade = 0;
        for (let i = limit, j = 0; i <= roll && j < this.upgrades.length; i += increment, j++) {
            upgrade++;
        }
        if (upgrade > this.upgrades.length - 1)
            upgrade = this.upgrades.length - 1;
        this.quality = upgrade;

    }

    applyRoll() {
       for(const key of Object.keys(this.upgrades[this.quality])){
        this[key]=this.upgrades[this.quality][key];
       }
    }
}
class CartBase extends CartPart {
    hp = BaseStats.CartBaseHP;
    ac = BaseStats.CartBaseAC;
    upgrades = [
        { hp: 40, ac: 12 }, { hp: 50, ac: 12 },
        { hp: 65, ac: 13 }, { hp: 75, ac: 14 }
    ]
    dc = { value: 13, increment: 2 };



}
class CartWheels extends CartPart {

    speed = -5;
    advantage = false;
    upgrades = [{ speed: -5, advantage: false },
    { speed: 0, advantage: false },
    { speed: 5, advantage: false },
    { speed: 10, advantage: true }
    ]
    dc = { value: 12, increment: 3 };
}

class CartHorse extends CartPart{

    ac = 10;
    hp = 30;
    speed = 0;
    advantage = false;
    disadvantage = true;
    rammingDamage=0;
    upgrades = [
        { speed: 0, ac: 0, advantage: false, disadvantage: true },
        { speed: 0, ac: 0, advantage: false, disadvantage: false },
        { speed: 5, ac: 1, advantage: false, disadvantage: false },
        { speed: 0, ac: 0, advantage: true, disadvantage: false }
    ]
    dc={value:10, increment:5}

}

class CartHorseArmor extends CartPart{

    ac=0;
    speed=0;
    rammingDamage=0;
    upgrades=[
        {ac:0, speed:0, rammingDamage:0},
        {ac:1, speed:0, rammingDamage:0},
        {ac:2, speed:-5, rammingDamage:0},
        {ac:1, speed:0, rammingDamage:5}
    ]
    dc={value:14, increment:2}
}




var base=new CartBase("Test Base");
var wheels= new CartWheels("Test Wheels");
var horse1= new CartHorse("Pierre");
var horse2 = new CartHorse("Pegasus");
var armor1=new CartHorseArmor("Leather");
var armor2=new CartHorseArmor("Chainmail");
const crew=[
    new CrewMember("Vlad",createStats(),ROLES.ATTACKER),
    new CrewMember("Brianna",createStats(),ROLES.DEFENDER),
    new CrewMember("Jasper",createStats(),ROLES.DRIVER)
];
armor1.evaluateRoll(14);
armor1.applyRoll();
armor2.evaluateRoll(12);
armor2.applyRoll();
base.evaluateRoll(15);
base.applyRoll();
wheels.evaluateRoll(18);
wheels.applyRoll();
horse1.evaluateRoll(15);
horse1.applyRoll();
horse2.evaluateRoll(19);
horse2.applyRoll();
var cart=new Cart(base,wheels,horse1,armor1,horse2,armor2,crew);
console.log(cart);

function createStats(){
    let stats= new Array(STATS.STATSCOUNT).fill(0);
    for(let i=0;i<stats.length;i++){
        stats[i]=Math.floor(Math.random()*4);
    }
    return stats;
}