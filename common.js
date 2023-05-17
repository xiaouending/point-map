/**
 * Public interface
 */
function moveCenterToPoint(objectId, isAnimated) {
  const pointObject = getObjectById(objectId);

  if (pointObject && Object.keys(pointObject).length) {
    const useMapMargin = selectedId != null;
    const pointInfo = pointObject.pointInfo;
    // Set margin-bottom for mobile overlay
    mapInstance.margin.setDefaultMargin([0, 0, marginBottomMobileOverlay, 0]);
    // Move the map to point
    mapInstance
      .panTo(pointObject.geometry?.coordinates, {
        useMapMargin: useMapMargin,
        duration: isAnimated ? animationDuration : 0,
      })
      .then(() => {
        // Clear margin-bottom after moved
        mapInstance.margin.setDefaultMargin(0);
      });

      // sendAction(pointInfo, actions.moveCenterToPoint);

      if (iOSDevice) {
        // iOS
        postMessage(JSON.stringify(pointInfo), actions.moveCenterToPoint);
      } else {
        // Android
        Letu.moveCenterToPoint(JSON.stringify(pointInfo))
      }
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

  // sendAction({
  //   lat,
  //   lon,
  //   isAnimated
  // }, actions.move)

  if (iOSDevice) {
    // iOS
    postMessage(JSON.stringify({ lat, lon, isAnimated }), actions.move);
  } else {
    // Android
    Letu.move(JSON.stringify({ lat, lon, isAnimated }))
  }
}

// function sendAction(actionValue, actionName) {
//   if (iOSDevice) {
//     // iOS
//     postMessage(JSON.stringify(actionValue), actionName);
//   } else {
//     // Android
//     Letu[actionName](actionValue);
//   }
// }

function setZoom(zoom) {
  mapInstance.setZoom(zoom, {
    smooth: true,
    duration: animationDuration,
  });

  // sendAction(zoom, actions.setZoom);

  if (iOSDevice) {
    // iOS
    postMessage(JSON.stringify(zoom), actions.setZoom);
  } else {
    // Android
    Letu.setZoom(JSON.stringify(zoom))
  }
}

function setZoomDefault() {
  mapInstance.setZoom(zoom, {
    smooth: true,
    duration: animationDuration,
  });

  // sendAction(zoom, actions.setZoomDefault);

  if (iOSDevice) {
    // iOS
    postMessage(JSON.stringify(zoom), actions.setZoomDefault);
  } else {
    // Android
    Letu.setZoomDefault(JSON.stringify(zoom))
  }
}

function zoomOut() {
  if (!isMinMapZoom()) {
    let nextZoom = mapInstance.getZoom() - 1;
    mapInstance.setZoom(nextZoom, {
      smooth: true,
      duration: animationDuration,
    });

    // sendAction(nextZoom, actions.zoomOut);

    if (iOSDevice) {
      // iOS
      postMessage(JSON.stringify(nextZoom), actions.zoomOut);
    } else {
      // Android
      Letu.zoomOut(JSON.stringify(nextZoom))
    }
  }
}

function zoomIn() {
  if (!isMaxMapZoom()) {
    let nextZoom = mapInstance.getZoom() + 1;
    mapInstance.setZoom(nextZoom, {
      smooth: true,
      duration: animationDuration,
    });

    // sendAction(nextZoom, actions.zoomIn);

    if (iOSDevice) {
      // iOS
      postMessage(JSON.stringify(nextZoom), actions.zoomIn);
    } else {
      // Android
      Letu.zoomIn(JSON.stringify(nextZoom))
    }
  }
}

function addUserPositionPin(lat, lon) {
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

  userLocationCollection.add(locationPlacemark); // Add user location point in collection
  mapInstance.geoObjects.add(userLocationCollection); // Add user location collection with point on map

  // sendAction(coords, actions.addUserPositionPin);

  if (iOSDevice) {
    // iOS
    postMessage(JSON.stringify(coords), actions.addUserPositionPin);
  } else {
    // Android
    Letu.addUserPositionPin(JSON.stringify(coords))
  }
}

function removeUserPositionPin() {
  clearSelectedMarker();
  userLocationCollection.removeAll(); // Clearing old data from the user location collection

  // sendAction('', actions.removeUserPositionPin);

  if (iOSDevice) {
    // iOS
    postMessage('', actions.removeUserPositionPin);
  } else {
    // Android
    Letu.removeUserPositionPin('')
  }
}

function selectPoint(objectId, isAnimated) {
  selectedId = null;
  moveCenterToPoint(objectId, isAnimated);
  selectedId = objectId;

  const pointInfo = getObjectById(id)?.pointInfo

  // sendAction(pointInfo, actions.selectPoint)

  if (iOSDevice) {
    // iOS
    postMessage(JSON.stringify(pointInfo), actions.selectPoint);
  } else {
    // Android
    Letu.selectPoint(JSON.stringify(pointInfo))
  }
}

function unselectPoints() {
  clearSelectedMarker();
  selectedId = null;
  // sendAction('', actions.unselectPoints)

  if (iOSDevice) {
    // iOS
    postMessage('', actions.unselectPoints);
  } else {
    // Android
    Letu.unselectPoints('')
  }
}

/**
 * Apply filters
 * @param {Array} selectedFiltersList list of strings to apply the filters. Example: ['ALL', 'NOTHING', 'SOME']
 */
function applyFilters(
  selectedFiltersList = [],
) {
  if (!objectManager) {
    return;
  }

  if (!selectedFiltersList.length) {
    objectManager.setFilter();
    return;
  }

  objectManager.setFilter((point) => {
    const valueToFilter = this.getValueToFilter(point);

    if (!valueToFilter) {
      return '';
    }

    return selectedFiltersList.includes(valueToFilter);
  });
}
/**
 * Public interface end
 */



/**
 * Private interface
 */
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
  const type = geoObject.pointInfo.type === 'store' ? 'store' : 'pointOfIssue';
  const presetName = pointOptions.preset.replace('letu#', '').replace('Selected', '');

  return getPlacemarkPresetInfo({
    name: presetName,
    ymaps,
    type,
    isSelected: isClicked,
  })
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
 * Set map instance and init objectManager
 *
 * @param {object} ymaps
 */
async function initMap(ymaps) {
  const center = [mapStartLat, mapStartLon];

  ymaps.ready(() => {
    const options = {
      ymaps,
    };

    const presets = [
      ...placemarks.storePresets,
      ...placemarks.pointOfIssuePresets,
    ];

    presets.forEach((name) => {
      options.name = name;
      options.type = type;

      ymaps.option.presetStorage.add(
        `letu#${name}`,
        getPlacemarkPresetInfo({
          ...options,
          isSelected: false,
        }),
      );

      ymaps.option.presetStorage.add(
        `letu#${name}Selected`,
        getPlacemarkPresetInfo({
          ...options,
          isSelected: true,
        }),
      );

      ymaps.option.presetStorage.add(
        `letu#${name}SelectedInactive`,
        getPlacemarkPresetInfo({
          ...options,
          isSelected: false,
        }),
      );

      ymaps.option.presetStorage.add(
        `letu#${name}Active`,
        getPlacemarkPresetInfo({
          ...options,
          isSelected: true,
        }),
      );
    });
  });

  mapInstance = new ymaps.Map(
    'point-search-map', {
      center: center,
      zoom: zoom,
      controls: [],
    }, {
      minZoom: minZoom,
      maxZoom: maxZoom,
      suppressMapOpenBlock: true,
    },
  );

  initObjectManager();
}

function bindEvents() {
  mapInstance.events.add('click', async (e) => {
    // sendAction('', actions.didTapOnMap)

    if (iOSDevice) {
      // iOS
      postMessage('', actions.didTapOnMap);
    } else {
      // Android
      Letu.didTapOnMap('')
    }
  });

  mapInstance.events.add('boundschange', async (e) => {
    objectManager.objects.each(function(geoObject) {
      const isClicked = selectedId == geoObject.id;
      const iconData = getObjectIcon(geoObject.id, isClicked);
      objectManager.objects.setObjectOptions(geoObject.id, iconData);

      const objectState = objectManager.getObjectState(geoObject.id);
      if (objectState?.isShown) {
        //todo: change city if more 50% points from other city
      }
    });
  });

  objectManager.objects.events.add('click', async (e) => {
    const clickedPointId = e.get('objectId');

    const iconData = getObjectIcon(clickedPointId, true);
    objectManager.objects.setObjectOptions(clickedPointId, iconData);

    selectedId = clickedPointId;
    const pointObject = getObjectById(clickedPointId);

    // console.log(pointObject);

    moveCenterToPoint(clickedPointId, hasAnimationOnMove);

    // sendAction(pointObject.pointInfo, actions.didTapOnPoint);

    if (iOSDevice) {
      // iOS
      postMessage(JSON.stringify(pointObject.pointInfo), actions.didTapOnPoint);
    } else {
      // Android
      Letu.didTapOnPoint(JSON.stringify(pointObject.pointInfo))
    }
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

      const objectsInfo = array.map((geoObject) => {
        return getObjectById(geoObject.id).pointInfo;
      });

      // sendAction(objectsInfo, actions.didTapOnCluster);

      if (iOSDevice) {
        // iOS
        postMessage(JSON.stringify(objectsInfo), actions.didTapOnCluster);
      } else {
        // Android
        Letu.didTapOnCluster(JSON.stringify(objectsInfo))
      }
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

function getObjectById(objectId) {
  return objectManager?.objects?.getById(objectId) || {};
}

/**
 * Yandex Map object Manager initialization and adding event listeners on points
 */
function initObjectManager() {
  const queryParams = {
    pushSite,
    skuId: skuId || null,
    latitude: globalSettings.map.userLat,
    longitude: globalSettings.map.userLon,
    type,
    selectedId,
    orderId: skuId ? null : orderId,
    cityId
  };

  const options = {
    clusterHasBalloon: false,
    clusterize: true,
    paddingTemplate: `${type}_%t`,
    clusterIconLayout: ymaps.templateLayoutFactory.createClass(
      getPlacemarkTemplate('cluster'),
    ),
    clusterIconShape: placemarks.iconShapes.cluster,
  }

  const path = `${pointsApiUrl}?b=%b&z=%z&${prepareQueryParams(queryParams)}`;

  objectManager = new ymaps.LoadingObjectManager(path, options);
  mapInstance.geoObjects.add(objectManager);
  userLocationCollection = new ymaps.GeoObjectCollection();

  bindEvents();

  addUserPositionPin(globalSettings.map.userLat, globalSettings.map.userLon, false);
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

function getValueToFilter(item) {
  if (!item) {
    return '';
  }

  const isStoreType =
    // First condition if item is a point, second if item is a location
    item.pointInfo?.type === 'store' ||
    item.type === 'store';

  // First result if item is a point, second if item is a location
  return isStoreType
    ? item.pointInfo?.deliveryInfo?.availabilityType ||
        item.deliveryInfo?.availabilityType
    : item.pointInfo?.type || item.type;
}

/**
 * Prepare placemark params to display custom icons on map
 * @param {string} name name of default template
 * @param {object} ymaps ymaps object
 * @param {boolean} isSelected to define the modifier of placemark element in template
 * @param {string} imagePath placemark inner image path
 * @return {String} transformed template
 */
function getPlacemarkTemplate(type = '', isSelected = false, imagePath = '') {
  let template = placemarks.templates[type];

  if (!template) {
    return '';
  }

  if (imagePath) {
    template = template.replace('[imagePath]', imagePath);
  }

  template = template.replace(
    '[isSelected]',
    isSelected ? 'selected' : 'not-selected',
  );

  return template;
}

/**
 * Prepare placemark params to display custom icons on map
 * @param {string} name name of preset
 * @param {object} ymaps ymaps object
 * @param {string} type current delivery type
 * @param {boolean} isSelected is point selected
 * @return {Object} transformed preset info
 */
function getPlacemarkPresetInfo({ name, ymaps, type, isSelected = false }) {
  const isStoreType = type === 'store';
  const getIconOffset = (shapeCoords) => [-shapeCoords[0], -shapeCoords[1] * 2];

  let iconShape = isSelected
    ? placemarks.iconShapes.pointSelected
    : placemarks.iconShapes.store;
  let iconLayout = ymaps?.templateLayoutFactory.createClass(
    getPlacemarkTemplate('store', isSelected),
  );

  let iconOffset = getIconOffset(iconShape.coordinates);

  if (isStoreType) {
    return {
      iconLayout,
      iconShape,
      iconOffset,
    };
  } else {
    if (!isSelected) {
      iconShape = placemarks.iconShapes.pointOfIssue;
      iconOffset = getIconOffset(iconShape.coordinates);
    }

    iconLayout = ymaps?.templateLayoutFactory.createClass(
      getPlacemarkTemplate(
        'pointOfIssue',
        isSelected,
        getPointOfIssueImagePath(name, true),
      ),
    );

    return {
      iconLayout,
      iconShape,
      iconOffset,
    };
  }
}

/**
 * Get point of issue image path
 * @param {string} type point of issue type
 * @param {boolean} isForPoint is image path for point of issue
 * @return {string} point of issue image path
 */
function getPointOfIssueImagePath(type, isForPoint = false) {
  let imageName = type;

  if (isForPoint) {
    imageName = imageName.replace('point', '');
    imageName = imageName.charAt(0).toLowerCase() + imageName.substring(1);
  }

  return `${imageName}.png`;
}
/**
 * Private interface end
 */
