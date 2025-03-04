// Browser compatibility testing using Selenium WebDriver
const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

const browsers = ['chrome', 'firefox', 'safari'];
const baseUrl = 'http://localhost:5000';

async function runCompatibilityTests() {
    for (const browserName of browsers) {
        let driver;
        try {
            driver = await new Builder().forBrowser(browserName).build();
            console.log(`Running tests on ${browserName}...`);

            // Test registration page
            await testRegistrationPage(driver);

            // Test login page
            await testLoginPage(driver);

            // Test appointment scheduling
            await testAppointmentScheduling(driver);

            console.log(`Tests completed successfully on ${browserName}`);
        } catch (error) {
            console.error(`Error in ${browserName}:`, error);
        } finally {
            if (driver) {
                await driver.quit();
            }
        }
    }
}

async function testRegistrationPage(driver) {
    await driver.get(`${baseUrl}/register`);
    
    // Test form validation
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();
    
    // Check error messages
    const errorMessages = await driver.findElements(By.css('.error-message'));
    assert(errorMessages.length > 0, 'Form validation errors should be displayed');

    // Test successful registration
    await driver.findElement(By.id('name')).sendKeys('Test User');
    await driver.findElement(By.id('email')).sendKeys('test@example.com');
    await driver.findElement(By.id('password')).sendKeys('Test123!@#');
    await driver.findElement(By.id('confirmPassword')).sendKeys('Test123!@#');
    await driver.findElement(By.id('terms')).click();
    
    await submitButton.click();
    
    // Wait for redirect
    await driver.wait(until.urlContains('dashboard'), 5000);
}

async function testLoginPage(driver) {
    await driver.get(`${baseUrl}/login`);
    
    // Test failed login
    await driver.findElement(By.id('email')).sendKeys('wrong@example.com');
    await driver.findElement(By.id('password')).sendKeys('wrongpassword');
    await driver.findElement(By.css('button[type="submit"]')).click();
    
    // Check error message
    const errorMessage = await driver.wait(until.elementLocated(By.css('.error-message')), 5000);
    assert(await errorMessage.isDisplayed(), 'Error message should be displayed');

    // Test successful login
    await driver.findElement(By.id('email')).clear();
    await driver.findElement(By.id('password')).clear();
    await driver.findElement(By.id('email')).sendKeys('test@example.com');
    await driver.findElement(By.id('password')).sendKeys('Test123!@#');
    await driver.findElement(By.css('button[type="submit"]')).click();
    
    // Wait for redirect
    await driver.wait(until.urlContains('dashboard'), 5000);
}

async function testAppointmentScheduling(driver) {
    // Login first
    await testLoginPage(driver);
    
    // Navigate to appointment scheduling
    await driver.findElement(By.css('[data-test="schedule-appointment"]')).click();
    
    // Test calendar interaction
    const calendarDay = await driver.findElement(By.css('.calendar-cell:not(.past):not(.empty)'));
    await calendarDay.click();
    
    // Test time slot selection
    const timeSlot = await driver.findElement(By.css('.time-slot:not(.disabled)'));
    await timeSlot.click();
    
    // Test appointment confirmation
    const confirmButton = await driver.findElement(By.id('confirmBooking'));
    await confirmButton.click();
    
    // Verify confirmation modal
    const confirmationModal = await driver.wait(
        until.elementLocated(By.id('confirmationModal')),
        5000
    );
    assert(await confirmationModal.isDisplayed(), 'Confirmation modal should be displayed');
}

// Run the tests
runCompatibilityTests().catch(console.error); 