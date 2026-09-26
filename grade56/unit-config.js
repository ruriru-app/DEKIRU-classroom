(() => {
  const units={
    'nh5:5':{main:['directions','positions','town'],sub:['impressions','animals']},
    'nh6:5':{main:['clothes','ingredients'],sub:['fruits_vegetables','stationery']},
    'nh6:6':{main:['nature','sea_animals','living_things'],sub:['animals','bugs']}
  };
  window.NheUnits={get:(book,unit)=>units[book+':'+unit]||null};
})();
