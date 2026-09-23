import { cityDestinations, type CityDestination } from '../data/cityDestinations';

/** Camera-only tour controls. Mounting never changes traveler or quest state. */
export function createCityTourUi(container: HTMLElement, onSelect: (destination: CityDestination) => void) {
  const element = document.createElement('div');
  element.className = 'city-tour-controls';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', '全城巡览');
  const overview = document.createElement('button');
  overview.type = 'button';
  overview.className = 'city-tour-overview';
  overview.textContent = '全城总览';
  const label = document.createElement('label');
  label.className = 'city-tour-label';
  label.textContent = '全城巡览';
  const select = document.createElement('select');
  select.className = 'city-tour-select';
  for (const destination of cityDestinations) {
    const option = document.createElement('option');
    option.value = destination.id;
    option.textContent = destination.label;
    select.append(option);
  }
  label.append(select);
  element.append(overview, label);
  container.append(element);

  const selectDestination = () => {
    const destination = cityDestinations.find(item => item.id === select.value);
    if (destination) onSelect(destination);
  };
  const selectOverview = () => {
    select.value = 'overview';
    selectDestination();
  };
  select.addEventListener('change', selectDestination);
  overview.addEventListener('click', selectOverview);
  return {
    element,
    dispose() {
      select.removeEventListener('change', selectDestination);
      overview.removeEventListener('click', selectOverview);
      element.remove();
    }
  };
}
