/**
 * Public interface
 */
function moveTo(objectId, isAnimated = hasAnimationOnMove) {
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

      sendAction(pointObject.geometry?.coordinates, actions.moveTo);
      sendAction(pointInfo, actions.selectPoint);
  }
}

// function move(lat, lon, isAnimated) {
//   const useMapMargin = selectedId != null;

//   // Set margin-bottom for mobile overlay
//   mapInstance.margin.setDefaultMargin([0, 0, marginBottomMobileOverlay, 0]);
//   // Move the map to point
//   mapInstance
//     .panTo([lat, lon], {
//       useMapMargin: useMapMargin, // Maybe using function param?
//       duration: isAnimated ? 500 : 0,
//     })
//     .then(() => {
//       // Clear margin-bottom after moved
//       mapInstance.margin.setDefaultMargin(0);
//     });

//   const iconData = getObjectIcon(selectedId, true);
//   objectManager.objects.setObjectOptions(selectedId, iconData);

//   sendAction({
//     lat,
//     lon,
//     isAnimated
//   }, actions.move)
// }

function sendAction(actionValue, actionName) {
  if (iOSDevice) {
    // iOS
    postMessage(actionValue, actionName);
  } else {
    // Android
    Letu[actionName]?.call(this, actionValue);
  }
}

function setZoom(zoom) {
  mapInstance.setZoom(zoom, {
    smooth: true,
    duration: animationDuration,
  });

  sendAction(zoom, actions.setZoom);
}

function setZoomDefault() {
  mapInstance.setZoom(zoom, {
    smooth: true,
    duration: animationDuration,
  });

  sendAction(zoom, actions.setZoomDefault);
}

function zoomOut() {
  if (!isMinMapZoom()) {
    let nextZoom = mapInstance.getZoom() - 1;
    mapInstance.setZoom(nextZoom, {
      smooth: true,
      duration: animationDuration,
    });

    sendAction(nextZoom, actions.zoomOut);
  }
}

function zoomIn() {
  if (!isMaxMapZoom()) {
    let nextZoom = mapInstance.getZoom() + 1;
    mapInstance.setZoom(nextZoom, {
      smooth: true,
      duration: animationDuration,
    });

    sendAction(nextZoom, actions.zoomIn);
  }
}

function addUserPositionPin(lat, lon, withMove = true) {
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

  if (withMove) {
    mapInstance.panTo(coords); // Moving to user coordinates
  }

  userLocationCollection.add(locationPlacemark); // Add user location point in collection
  mapInstance.geoObjects.add(userLocationCollection); // Add user location collection with point on map

  sendAction(coords, actions.addUserPositionPin);
}

function removeUserPositionPin() {
  clearSelectedMarker();
  userLocationCollection.removeAll(); // Clearing old data from the user location collection

  sendAction('', actions.removeUserPositionPin);
}

function selectPoint(lat, lon, id, isAnimated = hasAnimationOnMove) {
  selectedId = null;
  moveTo(lat, lon, isAnimated);
  selectedId = id;

  const pointInfo = getObjectById(id)?.pointInfo

  sendAction(pointInfo, actions.selectPoint)
}

function unselectPoints(isAnimated = hasAnimationOnMove) {
  clearSelectedMarker();

  selectedId = null;
  moveTo(globalSettings.map.userLat, globalSettings.map.userLon, isAnimated);

  sendAction('', actions.unselectPoints)
}

/**
 * Apply filters
 * @param {Array} selectedFiltersList list of strings to apply the filters. Example: ['ALL', 'NOTHING', 'SOME']
 * @param {Boolean} shouldRerenderMapFiltersComponent a flag to rerender filters on map component
 */
function applyFilters(
  selectedFiltersList = [],
) {
  if (!objectManager) {
    return;
  }

  sendAction(selectedFiltersList, actions.applyFilters);

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
      restrictMapArea: [
        [-48.054834277205416, -133.6464983758221],
        [84.94772717006953, -133.64649837589238],
      ],
      minZoom: minZoom,
      maxZoom: maxZoom,
      suppressMapOpenBlock: true,
    },
  );

  initObjectManager();
}

function bindEvents() {
  mapInstance.events.add('click', async (e) => {
    sendAction('', actions.didTapOnMap)
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
    clearSelectedMarker();

    const clickedPointId = e.get('objectId');

    const iconData = getObjectIcon(clickedPointId, true);
    objectManager.objects.setObjectOptions(clickedPointId, iconData);

    selectedId = clickedPointId;
    const pointObject = getObjectById(clickedPointId);

    console.log(pointObject);

    moveTo(clickedPointId);

    sendAction(pointObject.pointInfo, actions.didTapOnPoint);
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
        return getObjectById(geoObject.id).pointInfo;
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

  addUserPositionPin(globalSettings.map.userLat, globalSettings.map.userLon, false)
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
  let iconShape = isSelected
    ? placemarks.iconShapes.pointSelected
    : placemarks.iconShapes.store;
  let iconLayout = ymaps?.templateLayoutFactory.createClass(
    getPlacemarkTemplate('store', isSelected),
  );

  const iconOffset = [0, -70];

  if (isStoreType) {
    return {
      iconLayout,
      iconShape,
      iconOffset,
    };
  } else {
    if (!isSelected) {
      iconShape = placemarks.iconShapes.pointOfIssue;
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

