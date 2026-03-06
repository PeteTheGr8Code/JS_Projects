import { ROLES, STATS } from "./CrewMember.js";
import { BaseStats } from "../racing.js";
export default class Cart{
    base;
    wheels;
    horses=[];
    speed=40;
    attacker;
    defender;
    driver;
    constructor(base,wheels,horse1,armor1,horse2,armor2,crew){
        this.base=base;
        this.wheels=wheels;
        this.horses=[horse1,horse2];
        this.assignCrew(crew);
        this.armorHorses(armor1,armor2);
        this.calculateSpeed();
        this.addCrewModifiers();
    }
    calculateSpeed(){
        this.speed=40;
        this.speed+=this.wheels.speed;
        for(const h of this.horses){
            this.speed+=h.speed;
        }
    }

    armorHorses(armor1,armor2){
        let armors=[armor1,armor2];
        for(let i=0;i<2;i++){
            let ac=BaseStats.HorseAC,speed=0,rammingDamage=0;
            let horse=this.horses[i],armor=armors[i];
            ac+=horse.ac+armor.ac;
            speed+=horse.speed+armor.speed;
            rammingDamage+=armor.rammingDamage;
            horse.ac=ac;
            horse.speed=speed;
            horse.rammingDamage=rammingDamage;
        }
    }

    addCrewModifiers(){
        this.base.ac+=this.defender.stats[STATS.STRENGTH];
        for(const horse in this.horses){
            horse.ac+=this.driver.stats[STATS.WISDOM];
        }
    }

    assignCrew(crew){
        for(let i=0;i<3;i++){
            switch(crew[i].role){
                case ROLES.ATTACKER:
                    this.attacker=crew[i];
                    break;
                case ROLES.DEFENDER:
                    this.defender=crew[i];
                    break;
                case ROLES.DRIVER:
                    this.driver=crew[i];
                    break;
            }
        }
    }
}
