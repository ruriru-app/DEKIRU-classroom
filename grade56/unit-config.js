(() => {
  const units={
    'nh5:5':{main:['directions','positions','town'],sub:['impressions','animals']},
    'nh6:1':{main:['activities','sports','personal_items'],sub:['months','dates','feelings','colors','people','family']},
    'nh6:2':{main:['daily_life','frequency'],sub:['numbers','days']},
    'nh6:3':{main:['past_actions','town','impressions'],sub:['weather','foods','desserts']},
    'nh6:4':{main:['actions_6','impressions'],sub:['animals','town','tastes']},
    'nh6:5':{main:['clothes','ingredients'],sub:['fruits_vegetables','stationery','personal_items']},
    'nh6:6':{main:['nature','sea_animals','living_things'],sub:['animals','bugs']},
    'nh6:7':{main:['past_actions','school_events'],sub:['meals','activities','impressions']},
    'nh6:8':{main:['club_activities','jobs'],sub:['school_events','activities','actions_6','subjects']}
  };
  window.NheUnits={get:(book,unit)=>units[book+':'+unit]||null};
})();
