/**
 * Photography
 *
 * All images are hosted by Wikimedia Commons and used under their respective
 * Creative Commons licences. Each constant points at a fixed, verified file
 * (checked at build time of this project) so the app never depends on random
 * placeholder photo services. Full credits live in `photoCredits` and are
 * rendered on the About page.
 */
export const photos = {
  everest: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Everest%2C_Himalayas.jpg/1920px-Everest%2C_Himalayas.jpg',
  everestSunset:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Sunset_view_of_Everest.jpg/1920px-Sunset_view_of_Everest.jpg',
  namche: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Namche_Bazaar%2C_Nepal.jpg/1920px-Namche_Bazaar%2C_Nepal.jpg',
  namcheMountains:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Namche_Bazaar%2C_Mountains%2C_Nepal.jpg/1920px-Namche_Bazaar%2C_Mountains%2C_Nepal.jpg',
  annapurnaBaseCamp:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Annapurna_Base_Camp_with_snow.jpg/1920px-Annapurna_Base_Camp_with_snow.jpg',
  annapurnaMassif:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Annapurna_Massif-IMG_5221-Pano.jpg/1920px-Annapurna_Massif-IMG_5221-Pano.jpg',
  machapuchare:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Machapuchare_%28Fishtail_Mountain%29.jpg/1920px-Machapuchare_%28Fishtail_Mountain%29.jpg',
  poonHill: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Poon_hill_viewpoint.jpg/1920px-Poon_hill_viewpoint.jpg',
  poonHillPanorama:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Panorama_from_poonhill-2019-BJ.jpg/1920px-Panorama_from_poonhill-2019-BJ.jpg',
  langtangTrail:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Langtang_Trekking_Trail_Rasuwa_Nepal.jpg/1920px-Langtang_Trekking_Trail_Rasuwa_Nepal.jpg',
  kyanjin: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Kyanjin_Gompa_Village_Rasuwa.jpg/1920px-Kyanjin_Gompa_Village_Rasuwa.jpg',
  gokyoLakes:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Gokyo_Lakes%2C_Dudh_Pokhari%2C_Nepal%2C_Himalayas.jpg/1920px-Gokyo_Lakes%2C_Dudh_Pokhari%2C_Nepal%2C_Himalayas.jpg',
  gokyoRi:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gokyo_Ri_summit%2C_Gokyo_Lake%2C_Nepal%2C_Himalayas.jpg/1920px-Gokyo_Ri_summit%2C_Gokyo_Lake%2C_Nepal%2C_Himalayas.jpg',
  manaslu:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Mt_Manaslu_from_Manaslu_basecamp.jpg/1920px-Mt_Manaslu_from_Manaslu_basecamp.jpg',
  mustang:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/The_kingdom_of_Lo%2C_Lomangthang%2C_Upper_Mustang_%28Pano%29.jpg/1920px-The_kingdom_of_Lo%2C_Lomangthang%2C_Upper_Mustang_%28Pano%29.jpg',
  kagbeni:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Kagbeni%2C_Paddies_2%2C_Mustang%2C_Nepal.jpg/1280px-Kagbeni%2C_Paddies_2%2C_Mustang%2C_Nepal.jpg',
  thorongLa:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Thorong_La_Pass%2C_Nepal.jpg/1920px-Thorong_La_Pass%2C_Nepal.jpg',
  thorongLaTeahouse:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Thorong_La_with_teahouse_in_April_2011.jpg/1920px-Thorong_La_with_teahouse_in_April_2011.jpg',
  phewa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Pokhara%2C_Phewa_Lake%2C_Nepal.jpg/1920px-Pokhara%2C_Phewa_Lake%2C_Nepal.jpg',
  bhaktapur:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Nepal_-_Bhaktapur_Nyatapola_temple.jpg/1920px-Nepal_-_Bhaktapur_Nyatapola_temple.jpg',
  kathmanduDurbar:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Historic_Pagoda_Style_Architecture_in_Kathmandu_Durbar_Square-IMG_4069.jpg/1920px-Historic_Pagoda_Style_Architecture_in_Kathmandu_Durbar_Square-IMG_4069.jpg',
  chitwan:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Indian_rhinoceros_%28Rhinoceros_unicornis%29_1.jpg/1920px-Indian_rhinoceros_%28Rhinoceros_unicornis%29_1.jpg',
} as const;

export const photoCredits: { label: string; source: string; licence: string }[] = [
  { label: 'Everest from the south, Khumbu', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Everest north face', source: 'Luca Galuzzi / Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Namche Bazaar and the Khumbu', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Annapurna Base Camp and Annapurna massif', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Machapuchare (Fishtail)', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Poon Hill at dawn', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Gokyo Lakes and Gokyo Ri', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Langtang valley trail and Kyanjin Gompa', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Manaslu from base camp', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Upper Mustang, Kagbeni and Jharkot', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Thorong La pass and teahouse', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Phewa Lake, Pokhara', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Nyatapola temple, Bhaktapur', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Kathmandu Durbar Square', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Greater one-horned rhinoceros, Chitwan', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Nagarkot panoramic hiking trail', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
  { label: 'Mountain lodges in Namche', source: 'Wikimedia Commons', licence: 'CC BY-SA' },
];
