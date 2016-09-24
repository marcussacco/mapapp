function initMap() {
  var map;
  var weather;
  var userLat;
  var userLon;
  var userCity;
  var userState;
  var curTempEl = document.getElementById('currentTemp');
  var curConEl = document.getElementById('currentCondition');
  var cityEl = document.getElementById('city');
  var stateEl = document.getElementById('state');
  var pointer = document.getElementById('pointerContain');
  var windDirEl = document.getElementById('direction');
  var windSpeedEl = document.getElementById('windSpeed');
  var high = document.getElementsByClassName('high');
  var low = document.getElementsByClassName('low');

  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
      fallBackLocation();
      console.log("Geolocation not available.");
    }
  }

  function showPosition(position) {
    userLat = position.coords.latitude;
    userLon = position.coords.longitude;
    getWeatherData();
  }

  function showError(error) {
    console.log('error!');
    fallBackLocation();
    switch(error.code) {
      case error.PERMISSION_DENIED:
          console.log("User denied the request for Geolocation.");
          break;
      case error.POSITION_UNAVAILABLE:
          console.log("Location information is unavailable.");
          break;
      case error.TIMEOUT:
          console.log("The request to get user location timed out.");
          break;
      case error.UNKNOWN_ERROR:
          console.log("An unknown error occurred.");
          break;
    }
  }

  function fallBackLocation(){
    var request = new XMLHttpRequest();
    request.open('GET', 'http://api.wunderground.com/api/ceb5d155ada684a6/geolookup/q/autoip.json', true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        var data = JSON.parse(request.responseText);

        //state/city
        userCity = data.location.city;
        userState = data.location.state;

        //coords
        userLat = Number(data.location.lat);
        userLon = Number(data.location.lon);

        displayMap();
        getWeatherData();
      }
    };
    request.send();
  }

  function displayMap(){
    map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: userLat, lng: userLon},
      zoom: 12,
      disableDefaultUI: true
    });

    map.setOptions({
      scrollwheel: false,
      navigationControl: false,
      mapTypeControl: false,
      scaleControl: false,
      draggable: false,
      styles: styles
    });
  }

  function getWeatherData(){
    var weatherRequest = new XMLHttpRequest();
    weatherRequest.open('GET', 'http://api.wunderground.com/api/ceb5d155ada684a6/hourly/forecast/conditions/geolookup/q/' + userLat + ',' + userLon + '.json', true);
    weatherRequest.onload = function() {
      if (weatherRequest.status >= 200 && weatherRequest.status < 400) {
        weather = JSON.parse(weatherRequest.responseText);
        userCity = weather.current_observation.display_location.city;
        userState = weather.current_observation.display_location.state_name;
        displayMap();
        showWeather(weather);
        toggleSet(weather);
        displayHourly(weather, "f");
      }
    };
    weatherRequest.send();
  }

  //draw hourly temp data to canvas
  function displayHourly(object, unitToggle){
    var beziers = [];
    var windowWidth = window.innerWidth;
    var xTime = 30;
    var maxTemp = -1000;
    var minTemp = 1000;
    var hour;
    var tempRange = 0;
    var canvas = document.getElementById("hourly");
    var ctx = canvas.getContext("2d");
    ctx.font = "8px sans-serif";

    if(windowWidth > 800){
      windowWidth = windowWidth/2;
      xTime = 45;
      ctx.font = "12px sans-serif";
      ctx.scale(2,2);
    }
    canvas.setAttribute("width", windowWidth);

    //set canvas height based on 12hr temperature range
    for(var b=0; b<12; b++){
      beziers[b] = ({x:xTime, y:object.hourly_forecast[b].temp.english});
      if(beziers[b].y > maxTemp){
        maxTemp = beziers[b].y;
      }else if(beziers[b].y < minTemp){
        minTemp = beziers[b].y;
      }

      xTime += windowWidth/13;
      tempRange = maxTemp - minTemp;
      ctx.canvas.height = tempRange * 4 + 55;
    }

    //draw points and lines
    for(var w=0; w<12; w++){
      var yValue = maxTemp - beziers[w].y;
      //Grab only the hour numbers from the API
      if(object.hourly_forecast[w].FCTTIME.civil.charAt(1) === ":"){
        //one digit
        hour = object.hourly_forecast[w].FCTTIME.civil.charAt(0);
      }else{
        //two digits
        hour = object.hourly_forecast[w].FCTTIME.civil.charAt(0) + object.hourly_forecast[w].FCTTIME.civil.charAt(1);
      }

      ctx.beginPath();
      ctx.arc(beziers[w].x, yValue * 4 + 5,4,0,Math.PI*2,true);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#F7D08A";
      ctx.fillText(hour, beziers[w].x - 5, canvas.height - 2);
      ctx.fillStyle = "#F79F79";
      if(unitToggle === "f"){
        ctx.fillText(object.hourly_forecast[w].temp.english, beziers[w].x - 7.5, yValue * 4 + 24);
      }else{
        ctx.fillText(object.hourly_forecast[w].temp.metric, beziers[w].x - 7.5, yValue * 4 + 24);
      }
      ctx.fillStyle = "#E3F09B";
      ctx.strokeStyle = "#F79F79";

      ctx.moveTo(15 ,canvas.height - 20);
      ctx.lineTo(ctx.canvas.width - 15, canvas.height - 20);
      ctx.stroke();
      ctx.fill();
    }
  }

  //fahrenheit/celsius toggle
  function toggleSet(weather){
    var tempUnits = document.getElementsByClassName('tempUnit');
    var tempToggle = document.getElementById('tempUnitToggle');
    tempUnits[0].classList.add('toggleSelected');

    tempToggle.onclick = function(){
      //if celsius
      if (tempUnits[0].classList.contains('toggleSelected')){
        tempUnits[0].classList.remove('toggleSelected');
        tempUnits[1].classList.add('toggleSelected');
        curTempEl.innerHTML = weather.current_observation.feelslike_c;
        for(var i=0; i<weather.forecast.simpleforecast.forecastday.length; i++){
          high[i].innerText = weather.forecast.simpleforecast.forecastday[i].high.celsius;
          low[i].innerText = weather.forecast.simpleforecast.forecastday[i].low.celsius;
        }
        displayHourly(weather, "c");
      //if fahrenheit
      }else{
        tempUnits[1].classList.remove('toggleSelected');
        tempUnits[0].classList.add('toggleSelected');
        curTempEl.innerHTML = weather.current_observation.feelslike_f;
        for(var j=0; j<weather.forecast.simpleforecast.forecastday.length; j++){
          high[j].innerText = weather.forecast.simpleforecast.forecastday[j].high.fahrenheit;
          low[j].innerText = weather.forecast.simpleforecast.forecastday[j].low.fahrenheit;
        }
        displayHourly(weather, "f");
      }
    };
  }

  function showWeather(weather){
    //get wind degrees (number), direction (string), and strength
    var windDeg = weather.current_observation.wind_degrees;
    var windDir = weather.current_observation.wind_dir;
    var windStr = weather.current_observation.wind_mph;

    //get and set forecast variables
    var forecast = weather.forecast.simpleforecast.forecastday;
    var condition = document.getElementsByClassName('condition');
    var dayName = document.getElementsByClassName('dayName');

    //display location, but use the full state name from weather data
    var stateName = weather.current_observation.display_location.state_name.toUpperCase();
    cityEl.innerHTML = weather.location.city;
    stateEl.innerHTML = stateName;

    //display current temp and condition
    curTempEl.innerHTML = weather.current_observation.feelslike_f;
    curConEl.innerHTML = weather.current_observation.weather;

    //display wind direction and strength
    pointer.style.transform = 'rotate(' + windDeg + 'deg)';
    windDirEl.innerHTML = windDir;
    windSpeedEl.innerHTML = windStr + " MPH";

    //display 4 day forecast...
    for(var i=0; i<forecast.length; i++){
      dayName[i].innerText = forecast[i].date.weekday;
      high[i].innerText = forecast[i].high.fahrenheit;
      low[i].innerText = forecast[i].low.fahrenheit;
      condition[i].innerText = forecast[i].conditions;
    }
  }

  getLocation();

  //google maps style properties
  var styles = [
    {
        "featureType": "all",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "hue": "#0047ff"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#63b5e5"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "gamma": 0.01
            },
            {
                "lightness": 20
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "saturation": -31
            },
            {
                "lightness": -33
            },
            {
                "weight": 2
            },
            {
                "gamma": 0.8
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "administrative.country",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "administrative.province",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "administrative.neighborhood",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "saturation": "6"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 30
            },
            {
                "saturation": 30
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "saturation": "-11"
            },
            {
                "lightness": "-67"
            },
            {
                "gamma": "4.57"
            },
            {
                "color": "#415d66"
            }
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "saturation": 20
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 20
            },
            {
                "saturation": -20
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 10
            },
            {
                "saturation": -30
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "saturation": 25
            },
            {
                "lightness": 25
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "saturation": "88"
            },
            {
                "lightness": "-10"
            },
            {
                "gamma": "3.15"
            },
            {
                "weight": "0.01"
            },
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "lightness": -20
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#5e8280"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "saturation": "-41"
            },
            {
                "lightness": "-4"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "off"
            },
            {
                "gamma": "2.40"
            }
        ]
    }
  ];
}
