// Mock for cheerio
module.exports = {
  load: jest.fn(() => {
    const $ = jest.fn((selector) => ({
      text: jest.fn(() => ''),
      html: jest.fn(() => ''),
      attr: jest.fn(() => ''),
      find: jest.fn(() => $()),
      each: jest.fn(),
      length: 0,
    }));
    $.html = jest.fn(() => '');
    return $;
  }),
};