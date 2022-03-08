// ==UserScript==
// @name         Report Russian Propaganda
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Report russian propaganda accounts across various social media web sites.
// @author       peacesender
// @match        https://*.instagram.com/*
// @match        https://web.telegram.org/k/
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjI5OSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNTEyIDBIMHYyOTguN2g1MTJWMFoiIGZpbGw9IiM0RDcyQzAiLz48cGF0aCBkPSJNNTEyIDE0OS4zSDB2MTQ5LjRoNTEyVjE0OS4zWiIgZmlsbD0iI0YyREQzMCIvPjwvc3ZnPg==
// @connect      palyanytsya.wakeup4.repl.co
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    const $ = document.querySelector.bind(document);

    class State {
        reporting;
        reportButton;
        progressBar;
        progressBarIndicator;

        progress(ratio) {
            if (this.progressBarIndicator) {
                this.progressBarIndicator.style.width = Math.round(ratio * 100) + "%";
            }
        }

        startReporting() {
            this.reporting = true;
            if (this.reportButton) {
                this.reportButton.disabled = true;
            }
            if (this.progressBar) {
                this.progressBar.style.display = "block";
            }

        }

        stopReporting() {
            this.reporting = false;
        }
    }

    const STATE = new State();
    // Expose state via window.STATE for debugging purposes.
    unsafeWindow.STATE = STATE;

    // <UI>
    // This block contains the common UI elements used across all services.

    function createReportButton(container, onClick) {
        if (!container) {
            return;
        };
        const id = "report_propaganda_button";
        let btn = container.querySelector(`#${id}`);
        if (btn) {
            return btn;
        }

        console.log('Create a new report button');
        btn = document.createElement("button");
        btn.id = id;
        btn.type = 'button';
        btn.innerHTML = 'Report Propaganda';
        container.appendChild(btn);
        STATE.reportButton = btn;
        btn.onclick = async () => onClick();
        GM_addStyle(`
#${id} {
    background-color: rgb(239, 90, 102);
    color: rgb(255, 255, 255);
    font-weight: 500;
    margin-left: 20px;
    padding: 8px 12px;
    border-radius: 4px;
    border: none;
    outline: none;
    cursor: pointer;
}

#${id}:disabled,
#${id}[disabled]{
  background-color: #cccccc;
  color: #666666;
  cursor: wait;
}`);
        return btn;
    }

    function createProgressBar() {
        console.log('Create progress bar');
        const PROGRESS_BAR_ID = "report_propaganda_progress_bar";
        const PROGRESS_BAR_INDICATOR_ID = "report_propaganda_progress_bar_indicator";
        const progressBar = document.createElement("div");
        progressBar.id = PROGRESS_BAR_ID;
        const progressBarIndicator = document.createElement("div");
        progressBarIndicator.id = PROGRESS_BAR_INDICATOR_ID;
        progressBar.appendChild(progressBarIndicator);
        document.body.appendChild(progressBar);
        STATE.progressBar = progressBar;
        STATE.progressBarIndicator = progressBarIndicator;
        GM_addStyle(`
#${PROGRESS_BAR_ID} {
  z-index: 100;
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 50px;
  background-color: #cccccc2a;
}

#${PROGRESS_BAR_INDICATOR_ID} {
  width: 1%;
  height: 100%;
  background-color: #95ee95;
}`)
    }

    // </UI>

    // <Utility>
    // This block contains service-agnostic helper functions.

    function simulateMouseClick(element) {
        const mouseClickEvents = ['mousedown', 'click', 'mouseup'];
        mouseClickEvents.forEach(mouseEventType =>
                                 element.dispatchEvent(
            new MouseEvent(mouseEventType, {
                view: unsafeWindow,
                bubbles: true,
                cancelable: true,
                buttons: 1
            })
        )
                                );
    }

    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }
    }

    function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    function randomBetween(min, max) {
        return min + Math.round(Math.random() * (max - min));
    }

    function sleep(ms) {
        console.log('Waiting for', ms, 'ms...')
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForElementToUpdate(el) {
        return new Promise((resolve, reject) => {
            const observer = new MutationObserver(() => {
                resolve();
                observer.disconnect();
            });
            observer.observe(el, { childList: true });
            // For safety, let's set a 10-second timeout if no update arrives.
            setTimeout(() => {
                reject("Didn't receive any DOM updates for ", el);
                observer.disconnect();
            }, 10000);
        })
    }

    // </Utility>

    function instagram() {
        const COLOR_ATTENTION = '#fc036f';
        const COLOR_SUCCESS = '#77d54c';
        const COLOR_WARNING = '#ffd24c';
        const ACCOUNTS_PER_DAY = 40;
        const DURATION_DAY = 24 * 60 * 60 * 1000;

        async function report(accounts) {
            async function hasChildNumber(selector, number) {
                return document.querySelectorAll(selector).length === number;
            }

            async function goToAccount($, account) {
                const searchButton = ".cTBqC"
                if ($(searchButton) == null) {
                    console.error(`Search button '${searchButton}' not found. Make sure the search results menu is closed.`);
                    return false;
                }

                // Click on the search button to open the search results menu.
                simulateMouseClick($(searchButton));
                console.log(`Search button '${searchButton}' clicked!`);

                // Simulate typing the search query
                const searchInput = ".XTCLo.d_djL.DljaH"
                // simulateMouseClick($(searchInput));
                setNativeValue($(searchInput), account);
                $(searchInput).dispatchEvent(new Event('input', { bubbles: true }));
                console.log(`Search query '${account}' entered!`);

                const firstSearchRow = ".fuqBx div:nth-child(1) a"
                // Wait for the search results...
                for (let attempt = 0; attempt < 5; attempt++) {
                    await sleep(randomBetween(500, 1000));
                    if ($(firstSearchRow)) {
                        break;
                    }
                }

                const link = $(firstSearchRow);
                if (!link) {
                    console.error(`Couldn't find search results. Make sure to return the focus to the page after kicking off the script. Or, try increasing the timeout above in case the search is slow.`)
                    return false;
                }

                link.click()

                console.log(`Link to account '${link}' clicked`);
                return true;
            }

            async function click($, account, i, btns) {
                await sleep(randomBetween(500, 1000));

                if (btns[i].skip) {
                    if (btns[i].skip() === true) {
                        console.log("SKIP step");
                        await click($, account, i + 1, btns);
                        return
                    }
                }

                if (i + 1 === btns.length) {
                    // wait longer before closing the dialog
                    console.log("...wait more...");
                    await sleep(randomBetween(1500, 2000));
                }

                const btn = btns[i].selector;
                for (let attempt = 0; attempt < 10; attempt++) {
                    console.log(`Wait for #${i} '${btn}' to appear...`);
                    await sleep(randomBetween(500, 1000));
                    if ($(btn)) {
                        break;
                    }
                }

                if ($(btn) === null) {
                    console.log("button #" + i + ": '" + btn + "' not found");
                    return;
                }

                $(btn).click();
                console.log("button #" + i + ": '" + btn + "' clicked");
                if (btns[i].wait) {
                    console.log("Waiting for DOM update...");
                    await btns[i].wait()
                    console.log("DOM Updated");
                }

                if (i + 1 === btns.length) {
                    console.log(`%cAccount '${account}' reported! Glory to Ukraine!`, `color: ${COLOR_SUCCESS}`);
                    return;
                }

                if (i + 1 < btns.length) {
                    await click($, account, i + 1, btns);
                }
            }

            function countReportedAccountsLastDay(accounts) {
                let reportedLastDay = 0;
                for (let account of accounts) {
                    const reported = localStorage.getItem(account);
                    // Check reported === "true" for backward-compatibility reasons: at
                    // first, we stored "true" in localStorage.
                    if (!reported || reported === "true") {
                        continue
                    }

                    const reportedAt = Number(reported);
                    const interval = Date.now() - reportedAt;
                    if (interval < DURATION_DAY) {
                        reportedLastDay++;
                    }
                }
                return reportedLastDay;
            }

            async function reportAccount($, account) {
                console.log("start reporting");
                await click($, account, 0, [
                    { selector: ".VMs3J .wpO6b" },
                    { selector: ".mt3GC button:nth-child(3)" },
                    { selector: ".J09pf button:nth-child(2)", wait: async () => waitForElementToUpdate($(".J09pf")), skip: async () => !hasChildNumber(".J09pf button", 2) },
                    { selector: ".J09pf button:nth-child(1)", wait: async () => waitForElementToUpdate($(".J09pf")) },
                    { selector: ".J09pf button:nth-child(11)" },
                    // { selector: "#igCoreRadioButtontag-3" },
                    // { selector: "._1XyCr .sqdOP.L3NKy.y3zKF" },
                    { selector: "._1XyCr .sqdOP.L3NKy.y3zKF" }
                ]);
            }

            // Kick off the script!
            console.log('%cIMPORTANT! Please move focus from Dev Tools back to the page!', `color: ${COLOR_ATTENTION}`)
            // Wait for the user to switch the focus back to the page.
            await sleep(5000);

            shuffle(accounts);
            console.log(`Accounts: ${accounts}`);

            const failedAccounts = [];
            let reportedLastDay = countReportedAccountsLastDay(accounts);
            if (reportedLastDay > 0) {
                console.log(`%cYou've reported ${reportedLastDay} accounts last day.`, `color: ${COLOR_SUCCESS}`);
            }

            for (const account of accounts) {
                STATE.progress(reportedLastDay / ACCOUNTS_PER_DAY);
                if (reportedLastDay >= ACCOUNTS_PER_DAY) {
                    console.log(`%cMax number of accounts(${ACCOUNTS_PER_DAY}) per day reached. Please re-run this script tomorrow. We'll stop russian propaganda!`, `color: ${COLOR_ATTENTION}`);
                    break;
                }

                try {
                    const reported = localStorage.getItem(account);
                    if (reported) {
                        console.log(`%cskip: account '${account}' already reported`, `color: ${COLOR_WARNING}`);
                        continue;
                    }

                    await sleep(randomBetween(1000, 2000));
                    const success = await goToAccount($, account);
                    if (!success) {
                        failedAccounts.push(account);
                        continue;
                    }

                    await sleep(randomBetween(500, 1000));

                    // Wait for the page to load
                    while (!document || document.readyState !== "complete") {
                        console.log("...wait...")
                        await sleep(randomBetween(100, 1000));
                    }

                    await sleep(randomBetween(1500, 3000));
                    // Call a function to report the account.
                    await reportAccount($, account);

                    localStorage.setItem(account, Date.now());
                    reportedLastDay++;
                }
                catch (err) {
                    console.error("failed to report '" + account + "' Error: " + err)
                }
            }
            GM_notification({
                title: "Report Russian Propaganda",
                text: "Finished reporting Instagram Accounts! Glory to Ukraine!",
            });

            if (failedAccounts.length > 0) {
                console.log("Failed accounts: " + failedAccounts)
            }
        }

        unsafeWindow.onblur = function() {
            if (STATE.reporting) {
                alert("Automatic reporting is in progress. Please stay on the page to complete the script execution.")
            }
        }

        new MutationObserver(() => {
            const container = $(".MWDvN");
            createReportButton(container, async () => {
                createProgressBar();
                STATE.startReporting();
                GM_xmlhttpRequest({
                    url: "https://palyanytsya.wakeup4.repl.co/list",
                    method: "GET",
                    responseType: "json",
                    onload: async ({response: accounts}) => {
                        await report(accounts);
                        STATE.stopReporting();
                    }
                });
            })
        }).observe($("#react-root"),{ childList: true, subtree: true });
    }

    function telegram() {
        console.log('Report Telegram Accounts');
        // TODO: Implement.
    }

    function twitter() {
        console.log('Report Twitter Accounts');
        // TODO: Implement.
    }

    const hostname = unsafeWindow.location.hostname;
    if (hostname.endsWith("instagram.com")) {
        instagram();
    } else if (hostname.endsWith("web.telegram.org")) {
        telegram();
    }
})();
