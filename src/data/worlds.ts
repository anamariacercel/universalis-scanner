// Static snapshot of FFXIV data centers / worlds.
// Universalis also exposes /api/v2/data-centers and /api/v2/worlds — but a
// static list avoids extra requests and keeps things responsive.

export type Region = 'North-America' | 'Europe' | 'Japan' | 'Oceania';

export interface DataCenter {
  name: string;
  region: Region;
  worlds: string[];
}

export const DATA_CENTERS: DataCenter[] = [
  // North America
  { name: 'Aether',    region: 'North-America', worlds: ['Adamantoise','Cactuar','Faerie','Gilgamesh','Jenova','Midgardsormr','Sargatanas','Siren'] },
  { name: 'Primal',    region: 'North-America', worlds: ['Behemoth','Excalibur','Exodus','Famfrit','Hyperion','Lamia','Leviathan','Ultros'] },
  { name: 'Crystal',   region: 'North-America', worlds: ['Balmung','Brynhildr','Coeurl','Diabolos','Goblin','Malboro','Mateus','Zalera'] },
  { name: 'Dynamis',   region: 'North-America', worlds: ['Cuchulainn','Golem','Halicarnassus','Kraken','Maduin','Marilith','Rafflesia','Seraph'] },
  // Europe
  { name: 'Chaos',     region: 'Europe', worlds: ['Cerberus','Louisoix','Moogle','Omega','Phantom','Ragnarok','Sagittarius','Spriggan'] },
  { name: 'Light',     region: 'Europe', worlds: ['Alpha','Lich','Odin','Phoenix','Raiden','Shiva','Twintania','Zodiark'] },
  // Japan
  { name: 'Elemental', region: 'Japan', worlds: ['Aegis','Atomos','Carbuncle','Garuda','Gungnir','Kujata','Tonberry','Typhon'] },
  { name: 'Gaia',      region: 'Japan', worlds: ['Alexander','Bahamut','Durandal','Fenrir','Ifrit','Ridill','Tiamat','Ultima'] },
  { name: 'Mana',      region: 'Japan', worlds: ['Anima','Asura','Chocobo','Hades','Ixion','Masamune','Pandaemonium','Titan'] },
  { name: 'Meteor',    region: 'Japan', worlds: ['Belias','Mandragora','Ramuh','Shinryu','Unicorn','Valefor','Yojimbo','Zeromus'] },
  // Oceania
  { name: 'Materia',   region: 'Oceania', worlds: ['Bismarck','Ravana','Sephirot','Sophia','Zurvan'] },
];

export const REGIONS: Region[] = ['North-America','Europe','Japan','Oceania'];
