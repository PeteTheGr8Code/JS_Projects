
export default class CrewMember {
    constructor(name, stats,role) {
        this.name = name;
        this.stats = stats;
        this.role=role;
        // stats example:
        // { str: 2, dex: 3, wis: 1, per: 4 }
    }

    roll(stat) {
        return Math.floor(Math.random() * 20) + 1 + (this.stats[stat] || 0);
    }
}

export const STATS={
    STRENGTH:0,
    DEXTERITY:1,
    WISDOM:2,
    PERCEPTION:3,
    SURVIVAL:4,
    NATURE:5,
    INVESTIGATION:6,
    TINKERTOOLS:7,
    CARPENTERTOOLS:8,
    ANIMALHANDLING:9,
    ATHLETICS:10,
    STATSCOUNT:11
}

export const ROLES={
    DRIVER:"Driver",
    ATTACKER: "Attacker",
    DEFENDER:"Defender"
}
