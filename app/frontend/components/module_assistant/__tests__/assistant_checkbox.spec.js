require('../assistant_checkbox');

describe('<assistant-checkbox>', () => {

  it('renders without errors', () => {
    document.body.innerHTML = '<assistant-checkbox></assistant-checkbox>';
    expect(document.body.innerHTML).toEqual('<assistant-checkbox></assistant-checkbox>');
  });

  it('has a shadow DOM', () =>{
    const el = document.createElement('assistant-checkbox');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeDefined();
  });

  it('renders correctly', () => {
    document.body.innerHTML = '<assistant-checkbox count="5" code="grc" checked><span slot="label-text">Test</span></assistant-checkbox>';
    const el = document.querySelector('assistant-checkbox');
    
    expect(el.querySelector('[slot="label-text"]').textContent).toEqual('Test');
    expect(el.shadowRoot.textContent).toContain('(5)');

    expect(el.shadowRoot.querySelector('input[type="checkbox"]').checked).toEqual(true);

    expect(el.code).toEqual("grc");
  });

  it('updates count attribute', () => {
    document.body.innerHTML = '<assistant-checkbox code="grc"></assistant-checkbox>';
    const el = document.querySelector('assistant-checkbox');
    
    el.count = 7;    

    expect(el.shadowRoot.querySelector('#count').textContent).toEqual(' (7)');
  });

});
