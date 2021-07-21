require('../fuzzy_search');


describe('<fuzzy-search>', () => {

  it('renders without errors', () => {
    document.body.innerHTML = '<fuzzy-search></fuzzy-search>';
    expect(document.body.innerHTML).toEqual('<fuzzy-search></fuzzy-search>');
  });

  it('has a shadow DOM', () =>{
    const el = document.createElement('fuzzy-search');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeDefined();
  });

  xit('searches correctly', () => {
    document.body.innerHTML = '<fuzzy-search></fuzzy-search>';
    const el = document.querySelector('fuzzy-search');
    el.init(data, ['text', 'code']);

  });
});

const data = [
  {code: "grc", text: "Ancient Greek (to 1453)", description: ""},
  {code: "hbo", text: "Ancient Hebrew", description: ""},
  {
    code: "ar",
    text: "Arabic",
    description: "",
  },
  {
    code: "bn",
    text: "Bangla",
    description: "",
  },
  {
    code: "zh-Hans",
    text: "Chinese",
    description: "Simplified",
  },
  {
    code: "zh-Hant",
    text: "Chinese",
    description: "Traditional",
  },
  {
    code: "zh",
    text: "Chinese",
    description: "",
  },
  {
    code: "en",
    text: "English",
    description: "",
  },
  {
    code: "fr",
    text: "French",
    description: "",
  },
  {
    code: "hi",
    text: "Hindi",
    description: "",
  },
  {
    code: "pt",
    text: "Portuguese",
    description: "",
  },
  {
    code: "ru",
    text: "Russian",
    description: "",
  },
  {
    code: "es",
    text: "Spanish",
    description: "",
  },
  {
    code: "ur",
    text: "Urdu",
    description: "",
  },
];

