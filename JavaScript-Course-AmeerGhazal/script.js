'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.delete_all_btn');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  // edit.addEventListener('click', this.edit.Bind(this));

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cy1 = new Cycling([39, -12], 5.2, 24, 17);
// console.log(run1, cy1);

////////////////////////
// Stores the workouts
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = []; // stores all the markers to remove if needed.

  constructor() {
    // User's Postition
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAll.addEventListener('click', this._reset);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
  }

  //   lat
  // :
  // 35.34495525936074
  // lng
  // :
  // -97.54331588745117

  // recives the position
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); /// last param is the zoom

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling Clicks on Map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear Input Fields
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    // Changes the running from cadence type.
    if (inputType.value == 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    } else {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
    }
  }

  _newWorkout(e) {
    // Helper methods
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; // destructuring
    let workout;

    // If workout running, create running object.
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers.');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cyclind, create cycling object.
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers.');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render workouton list
    this._renderWorkout(workout);

    // Hidefor + clear the input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    // Enable the edit button
    const edit = document
      .querySelector('.edit__btn')
      .addEventListener('click', this._editWorkout.bind(this));

    // Enables the remove button
    const remove = document
      .querySelector('.delete__btn')
      .addEventListener('click', this._deleteWorkout.bind(this));
  }

  _deleteWorkout(e) {
    console.log(this.#workouts);
    const certainWorkout = e.target.closest('.workout'); // we want the closet parent.

    certainWorkout.remove(); // removes that workout / deletes its html from the index.

    // returns the index inside the workouts array of the certainworkout (if the ids match).
    const index = this.#workouts.findIndex(
      workout => workout.id === certainWorkout.dataset.id
    );

    // sets the map when we click edit.
    this.#mapEvent = {
      latlng: {
        lat: this.#workouts[index].coords[0],
        lng: this.#workouts[index].coords[1],
      },
    };

    // mutates and updates the workouts array by finding the index of the workout to be deleted.
    this.#workouts.splice(index);

    // calls the remove marker method
    this._removeMarker(index);

    // Updates the local storage to all workouts
    this._setLocalStorage();
  }

  _editWorkout(e) {
    const type = e.target.closest('.workout').dataset.type;
    inputType.value = type; // sets the type.
    inputType.dispatchEvent(new Event('change')); // triggers the event to change from mdn. Manually trigger the event.
    // const type = inputType.value; // saves the current values
    const selector = document.querySelector(`.workout--${type}`);
    const values = [...selector.querySelectorAll('.workout__value')]; // returns a node list. Spread into an array.
    const inputs = [
      inputDistance,
      inputDuration,
      0,
      type === 'running' ? inputCadence : inputElevation,
    ]; // different inputs in a list.

    form.style.display = 'grid'; // brings back the form
    form.classList.remove('hidden');

    this._deleteWorkout(e); // calls the delete workout method to delete form the global.

    // gets all the values into a list.
    values.map((val, i) => {
      if (i == 2) return;
      inputs[i].value = val.textContent;
    });
  }

  //Display workout marker
  _renderWorkoutMarker(workout) {
    // store the marker in a variable to add to the list.
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      );

    marker
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#markers.push(marker); // stores all the markers so it makes it easy to delete them.
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${
      workout.id
    }" data-type="${workout.type}">
    <button class="edit__btn">Edit</button>
    <button class="delete__btn">Remove</button>
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value distance">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value duration">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running')
      html += ` 
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;

    if (workout.type === 'cycling')
      html += `   
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _removeMarker(index) {
    this.#map.removeLayer(this.#markers[index]); // removes the marker from map.
    this.#markers.splice(index); // updates it for local storage.
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // guard clause when removing.
    if (!workout) return;

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // will be exctued at the beginning
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    // loops through the data array
    data.forEach(workout => {
      if (workout.type === 'running') {
        // destructures into an object and reconstructs object
        const { coords, distance, duration, cadence } = workout;
        workout = new Running(coords, distance, duration, cadence);
        // pushs it to the workouts array.
        this.#workouts.push(workout);
      }

      if (workout.type === 'cycling') {
        const { coords, distance, duration, elevationGain } = workout;
        workout = new Cycling(coords, distance, duration, elevationGain);
        this.#workouts.push(workout);
      }
    });

    // this.#workouts = data; // restores data after reloads

    this.#workouts.forEach(work => {
      this._renderWorkout(work);

      const edit = document
        .querySelector('.edit__btn')
        .addEventListener('click', this._editWorkout.bind(this));

      // Enables the remove button
      const remove = document
        .querySelector('.delete__btn')
        .addEventListener('click', this._deleteWorkout.bind(this));
    });
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// Ability to edit a workout

// Ability to delete a workout
// Ability to delete all workouts
// Re-build Running and Cycling objects coming from local storage.
