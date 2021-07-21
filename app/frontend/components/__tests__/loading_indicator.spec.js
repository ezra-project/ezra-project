require('../loading_indicator');

describe('<loading-indicator>', () => {
  it('renders without errors', async () => {
    document.body.innerHTML = '<loading-indicator></loading-indicator>';
    expect(document.body.innerHTML).toContain('class="loader"');
  });
});
