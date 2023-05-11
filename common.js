window.onload = function() {
  initialization();
};

function initialization() {
  loadMap().then((newYmaps) => {
    ymaps = newYmaps;

    ymaps.ready(async function() {
      await initMap(ymaps);
    });
  });
}

function getObjectIcon(objectId, isClicked) {
  const geoObject = objectManager.objects.getById(objectId);

  const pointOptions = geoObject.options;
  const presetName = pointOptions.preset.replace('letu#', '').replace('Selected', '');
  const mapPin = mapPins[presetName];
  let isInitialSelected = objectId == initialSelectedId;
  const imgName = isInitialSelected ? mapPin.selected : mapPin.normal;

  const iconImageSize = isClicked ? iconImageCoords.size.big : iconImageCoords.size.small;
  const iconImageOffset = isClicked ? iconImageCoords.offset.big : iconImageCoords.offset.small;

  return {
    iconLayout: 'default#image',
    iconImageHref: imgName,
    iconImageSize,
    iconImageOffset,
  };
}

/**
 * Send a message using the specified key for iOS
 *
 * @param {String} message
 * @param {String} condition
 */
function postMessage(message = '', condition = '') {
  try {
    webkit.messageHandlers[condition].postMessage(message);
  } catch (err) {
    console.log(err);
  }
}

/**
 * Prepare placemark params to display custom icons on map
 *
 * @param {string} name
 * @param {boolean} isSelected
 * @return {{iconImageHref: string, iconLayout: string}}
 */
function getPresetInfo(name, isSelected) {
  const mapPin = mapPins[name];
  const imgName = isSelected ? mapPin.selected : mapPin.normal;

  const iconImageSize = iconImageCoords.size.small;
  const iconImageOffset = iconImageCoords.offset.small;

  return {
    iconLayout: 'default#image',
    iconImageHref: imgName,
    iconImageSize,
    iconImageOffset,
  };
}

/**
 * Set map instance and init objectManager
 *
 * @param {object} ymaps
 */
async function initMap(ymaps) {
  const center = [lat, lon];

  ymaps.ready(() => {
    Object.keys(mapPins).forEach((name) => {
      // Add preset for normal icon
      ymaps.option.presetStorage.add(`letu#${name}`, getPresetInfo(name, false));
      // Add preset for selected icon
      ymaps.option.presetStorage.add(`letu#${name}Selected`, getPresetInfo(name, true));
    });
  });

  mapInstance = new ymaps.Map(
    'point-search-map', {
      center: center,
      zoom: zoom,
      controls: [],
    }, {
      restrictMapArea: [
        [-48.054834277205416, -133.6464983758221],
        [84.94772717006953, -133.64649837589238],
      ],
      minZoom: minZoom,
      maxZoom: maxZoom,
      suppressMapOpenBlock: true,
    },
  );

  await initObjectManager();
}

function moveCenterToPoint(objectId, isAnimated) {
  const pointObject = getObjectById(objectId);

  if (pointObject) {
    // Set margin-bottom for mobile overlay
    mapInstance.margin.setDefaultMargin([0, 0, marginBottomMobileOverlay, 0]);
    // Move the map to point
    mapInstance
      .panTo(pointObject.geometry.coordinates, {
        useMapMargin: true, // Maybe using function param?
        duration: isAnimated ? 500 : 0,
      })
      .then(() => {
        // Clear margin-bottom after moved
        mapInstance.margin.setDefaultMargin(0);
      });
  }
}

function sendAction(actionValue, actionName) {
  let Letu = {}

  if (iOSDevice) {
    // iOS
    postMessage(actionValue, actionName);
  } else {
    // Android
    console.log(actionValue, actionName)
  }
}

function bindEvents() {
  mapInstance.events.add('click', async (e) => {
    clearSelectedMarker();

    sendAction('', actions.didTapOnMap)
  });

  mapInstance.events.add('boundschange', async (e) => {
    objectManager.objects.each(function(geoObject) {
      const isClicked = selectedId == geoObject.id || geoObject.id == preselectedPointId;
      const iconData = getObjectIcon(geoObject.id, isClicked);
      objectManager.objects.setObjectOptions(geoObject.id, iconData);
    });
  });

  objectManager.objects.events.add('click', async (e) => {
    clearSelectedMarker();

    const clickedPointId = e.get('objectId');
    if (clickedPointId == preselectedPointId) {
      return;
    }

    const iconData = getObjectIcon(clickedPointId, true);
    objectManager.objects.setObjectOptions(clickedPointId, iconData);

    selectedId = clickedPointId;
    const pointObject = getObjectById(clickedPointId);
    const pointCoords = pointObject?.geometry?.coordinates;

    moveCenterToPoint(clickedPointId, hasAnimationOnMove);

    sendAction(pointObject, actions.didTapOnPoint);
  });

  // Processing a click on clusters
  objectManager.events.add('click', (e) => {
    const objectId = e.get('objectId');

    if (hasBalloonData(objectId)) {
      const cluster = objectManager.clusters.getById(objectId);
      const geoObjects = cluster.properties.geoObjects;
      const array = geoObjects.filter((geoObject) => {
        return !geoObject.properties.balloonContent;
      });

      const objects = array.map((geoObject) => {
        return getObjectById(geoObject.id);
      });

      sendAction(objects, actions.didTapOnCluster);
    }
  });
}

function hasBalloonData(objectId) {
  const cluster = objectManager.clusters.getById(objectId);
  if (cluster == null) {
    return false;
  }

  return true;
}

function clearSelectedMarker() {
  if (selectedId && objectManager) {
    const iconData = getObjectIcon(selectedId, false);
    objectManager.objects.setObjectOptions(selectedId, iconData);
    selectedId = null;
  }
}

function move(lat, lon, isAnimated) {
  const useMapMargin = selectedId != null;

  // Set margin-bottom for mobile overlay
  mapInstance.margin.setDefaultMargin([0, 0, marginBottomMobileOverlay, 0]);
  // Move the map to point
  mapInstance
    .panTo([lat, lon], {
      useMapMargin: useMapMargin, // Maybe using function param?
      duration: isAnimated ? 500 : 0,
    })
    .then(() => {
      // Clear margin-bottom after moved
      mapInstance.margin.setDefaultMargin(0);
    });

  const iconData = getObjectIcon(selectedId, true);
  objectManager.objects.setObjectOptions(selectedId, iconData);

  sendAction({
    lat,
    lon,
    isAnimated
  }, actions.move)
}

function setZoom(zoom) {
  mapInstance.setZoom(zoom, {
    smooth: true,
    duration: zoomDurationMs,
  });

  sendAction(zoom, actions.setZoom);
}

function setZoomDefault() {
  mapInstance.setZoom(zoom, {
    smooth: true,
    duration: zoomDurationMs,
  });

  sendAction(zoom, actions.setZoomDefault);
}

function zoomOut() {
  if (!isMinMapZoom()) {
    let nextZoom = mapInstance.getZoom() - 1;
    mapInstance.setZoom(nextZoom, {
      smooth: true,
      duration: zoomDurationMs,
    });

    sendAction(nextZoom, actions.zoomOut);
  }
}

function zoomIn() {
  if (!isMaxMapZoom()) {
    let nextZoom = mapInstance.getZoom() + 1;
    mapInstance.setZoom(nextZoom, {
      smooth: true,
      duration: zoomDurationMs,
    });

    sendAction(nextZoom, actions.zoomIn);
  }
}

function addUserPositionPin(lat, lon) {
  clearSelectedMarker();

  userLocationCollection.removeAll(); // Clearing old data from the user location collection

  const coords = [lat, lon];

  const locationPlacemark = new ymaps.Placemark(
    coords, {}, {
      iconLayout: 'default#image',
      iconImageHref: userPositionPin,
      iconImageSize: [32, 32],
      iconImageOffset: [-16, -16],
    },
  );

  mapInstance.panTo(coords); // Moving to user coordinates
  userLocationCollection.add(locationPlacemark); // Add user location point in collection
  mapInstance.geoObjects.add(userLocationCollection); // Add user location collection with point on map

  sendAction(coords, actions.addUserPositionPin);
}

function removeUserPositionPin() {
  clearSelectedMarker();
  userLocationCollection.removeAll(); // Clearing old data from the user location collection

  sendAction('', actions.removeUserPositionPin);
}

function selectPoint(lat, lon, id, isAnimated) {
  selectedId = null;
  move(lat, lon, isAnimated);
  selectedId = id;

  sendAction(getObjectById(id), actions.selectPoint)
}

function unselectPoints(isAnimated) {
  selectedId = null;
  move(lat, lon, isAnimated);

  sendAction('', actions.unselectPoints)
}

function showOnlyPreselectedPoint() {
  objectManager.setFilter((point) => {
    return point.id === preselectedPointId;
  });
}

function getObjectById(objectId) {
  return objectManager?.objects?.getById(objectId) || {};
}

/**
 * Yandex Map object Manager initialization and adding event listeners on points
 */
async function initObjectManager() {
  const queryParams = {
    pushSite,
    skuId: skuId || null,
    latitude: globalSettings.map.lat,
    longitude: globalSettings.map.lon,
    type,
    selectedId,
    orderId,
    cityId
  };

  const options = {
    clusterHasBalloon: false,
    clusterize: true,
    paddingTemplate: `${type}_%t`,
  }

  const path = `${pointsApiUrl}?b=%b&z=%z&${prepareQueryParams(queryParams)}`;

  objectManager = new ymaps.LoadingObjectManager(path, options);
  mapInstance.geoObjects.add(objectManager);
  userLocationCollection = new ymaps.GeoObjectCollection();

  if (preselectedPointId) {
    showOnlyPreselectedPoint();
  }

  bindEvents();
}

/**
 * Get, validate and apply filter params on map
 *
 * @param {string} filtersValue example: 'storeWithStocksFromHub,storeWithStocksInStore'
 */
async function applyFilters(filtersValue) {
  if (!objectManager) {
    return;
  }

  const selectedFilters = filtersValue

  if (Object.keys(objectManager).length !== 0) {
    const filtersValidate = (items) => {
      if (items?.length) {
        return items.filter((item) => storeFilters.includes(item));
      }
      return [];
    };
    const filtersList = filtersValidate(selectedFilters?.split(','));
    if (selectedFilters && filtersList?.length) {
      objectManager.setFilter((point) => {
        return filtersList.indexOf(point.options?.preset.replace('letu#', '')) > -1;
      });

      sendAction(filtersValue, actions.applyFilters)
    } else {
      objectManager.setFilter();

      sendAction('', actions.applyFilters)
    }
  }
}

function prepareQueryParams(params) {
  return Object.keys(params)
    .reduce((arr, val) => {
      if (params[val]) {
        arr.push(val + '=' + encodeURIComponent(params[val]));
      }
      return arr;
    }, [])
    .join('&');
}


// Load yMap script
let yaMapApi;
let promise;

function loadMap() {
  if (yaMapApi) {
    return Promise.resolve(yaMapApi);
  }

  if (!promise) {
    promise = new Promise((resolve, reject) => {
      loadScript(globalSettings.scriptSrc);

      window.yandexMapsAPILoad = (ymaps) => {
        yaMapApi = ymaps;

        resolve(yaMapApi);
      };
    });
  }

  return promise;
}

const loadScript = (src) => {
  const script = document.createElement('script');

  script.type = 'text/javascript';
  script.src = src;

  document.querySelector('head').appendChild(script);
}
