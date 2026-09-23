import { createCityTourUi } from './cityTourUi';
import { cityDestinations } from '../data/cityDestinations';

describe('whole city camera tour', () => {
  it('offers an accessible overview and named targets without activating on mount', () => {
    const container = document.createElement('div');
    const onSelect = vi.fn();
    createCityTourUi(container, onSelect);
    const button = container.querySelector('button')!;
    const select = container.querySelector('select')!;
    expect(button.textContent).toBe('全城总览');
    expect(select.labels?.[0].textContent).toContain('全城巡览');
    expect(select.options.length).toBe(cityDestinations.length);
    expect(onSelect).not.toHaveBeenCalled();
    for (const destination of cityDestinations) {
      select.value = destination.id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      expect(onSelect).toHaveBeenLastCalledWith(destination);
    }
    button.click();
    expect(onSelect).toHaveBeenLastCalledWith(cityDestinations.find(d => d.id === 'overview'));
    expect(select.value).toBe('overview');
  });

  it('removes its own UI and listeners on disposal while preserving host content', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>existing controls</p>';
    const onSelect = vi.fn();
    const ui = createCityTourUi(container, onSelect);
    const button = ui.element.querySelector('button')!;
    const select = ui.element.querySelector('select')!;
    ui.dispose();
    button.click();
    select.dispatchEvent(new Event('change'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(container.textContent).toBe('existing controls');
  });
});
