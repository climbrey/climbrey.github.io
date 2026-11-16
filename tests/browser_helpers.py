"""Shared user actions for the reading site browser checks."""
from playwright.sync_api import expect


def open_card_panel(page, name):
    button = page.locator('.maker-tools [data-action="share-tool"][data-id="' + name + '"]')
    if button.get_attribute('aria-expanded') != 'true':
        button.click()


def open_settings(page):
    if page.locator('[data-action="settings"]').count() == 0:
        page.goto(page.url.split('#')[0] + '#saved')
    page.locator('[data-action="settings"]').click()


def close_surface(page):
    if page.locator('#modal').is_visible():
        page.locator('.modal-header [data-action="close-modal"]').click()
        expect(page.locator('#modal')).not_to_be_visible()
    else:
        page.locator('.maker-back').click()
        expect(page.locator('.maker-page')).to_have_count(0)
