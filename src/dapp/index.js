
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {
    let result = null;
    let contract = new Contract('localhost', () => {

        contract.subscribeToEvents((event) => {
            var snackbar = DOM.elid("snackbar");

            snackbar.className = "show";
            snackbar.textContent = `New event received: ${event.event}`;

            // After 3 seconds, remove the show class from DIV
            setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 3000);
        });

        // Builds the dropdown with all the available addresses for the airlines
        const airlineSelect = DOM.elid("airline-select");
        let flights = [];
        contract.airlines.map((result) => {
            let option = DOM.option();
            option.value = result;
            option.text = result;
            airlineSelect.appendChild(option);
        });

        const updateFlights = function(airline, count) {
            const flightSelect = DOM.elid("flight-select");

            // Removes all previous options
            while (flightSelect.options.length > 0) {                
                flightSelect.remove(0);
            }  

            flights = [];
            for (let i=0; i < count ;i ++) {
                contract.getFlight(airline, i, (error, result)=> {
                    let option = DOM.option();
                    option.value = i;
                    option.text = result.flight;
                    flightSelect.appendChild(option);
                    flights.push({flight: result.flight, timestamp: result.timestamp});
                });
            }
        }

        // updates the fields with the status of the airline
        const updateAirlineStatus = function(state, stateName, name) {
            let statusLabel = DOM.elid("airline-status");
            if (state == 0) {
                statusLabel.textContent = `No Airline is registered with the specified address. You can register a new Airline`;
            }else {
                statusLabel.textContent = `Airline is registered with name: ${name}. Current status is ${stateName}`;
            }
        }

        const airlineSelected = function() {
            const airline = DOM.elid("airline-select").value;
            contract.getAirlineInfo(airline, (error, result) => {
                if(error) console.log(error);
                if(result) updateAirlineStatus(result.state, result.stateName, result.name);
            });

            contract.getNumFlightsRegistered(airline, (error, count) => {
                let countLabel = DOM.elid("flights-registred");
                countLabel.textContent = count;
    
                updateFlights(airline, count);
                
            });
        }

        airlineSelected();

        DOM.elid('airline-select').addEventListener('change', () => {
            console.log('on change called')
            airlineSelected();
        });

        // Builds a dropdown with the addresses available for passengers
        const passengerSelect = DOM.elid("passenger-select");
        contract.passengers.map((result) => {
            let option = DOM.option();
            option.value = result;
            option.text = result;
            passengerSelect.appendChild(option);
        });

        // Checks the status of the contract and updates the UI with the result
        contract.isOperational((error, result) => {
            let statusLabel = DOM.elid("contract-status");
            statusLabel.textContent = result ? "Operational" : "Non Operational"
        });

        // Button select-airline is clicked
        DOM.elid('select-airline').addEventListener('click', () => {
            // TODO:
        });

        // Button register airline is clicked
        DOM.elid('submit-airline').addEventListener('click', () => {
            const airline = DOM.elid("airline-select").value;
            const airlineName = DOM.elid('airline-name').value;
            contract.registerAirline(airline, airlineName, (error, success) => {
                if (error) DOM.elid("new-airline-status").textContent = error.message;

                // Gets the airline info for the new registered airline
                if (success) {
                    contract.getAirlineInfo(airline, (error, result) => {
                        if(error) console.log(error);
                        if(result) DOM.elid("new-airline-status").textContent = `Airline was registered in state: ${result.stateName}`;
                    });
                }
                
            });
        });

        // Button Fund Airline is clicked
        DOM.elid('fund-airline').addEventListener('click', () => {
            const airline = DOM.elid("airline-select").value;
            contract.fundAirline(airline, (error, success) => {
                if (error) DOM.elid("new-airline-status").textContent = error.message;
                if (success) {
                    contract.getAirlineInfo(airline, (error, result) => {
                        if(error) console.log(error);
                        if(result) DOM.elid("new-airline-status").textContent = `New airline state is: ${result.stateName}`;
                    });
                }
            });
        });

        DOM.elid('submit-flight').addEventListener('click', () => {
            const airline = DOM.elid("airline-select").value;
            const flight = DOM.elid("flight-code").value;
            const time = DOM.elid("flight-timestamp").value;
            const timestamp = new Date(time).getTime();

            contract.registerFlight(airline, flight, timestamp, (error, success) => {
                if (error) DOM.elid("new-flight-status").textContent = error.message;
                if (success) {
                    DOM.elid("new-flight-status").textContent = `Flight: ${flight} was registered`;

                    // Updates the number of registered flights
                    contract.getNumFlightsRegistered(airline, (error, count) => {
                        let countLabel = DOM.elid("flights-registred");
                        countLabel.textContent = count;
                        updateFlights(airline, count);
                    });
                }
            });
        });

        // gets passenger available balance
        DOM.elid('get-balance').addEventListener('click', () => {
            const passenger = DOM.elid("passenger-select").value;
            // Write transaction
            contract.getPassengerBalance(passenger, (error, result) => {
                console.log(result);
                DOM.elid("passenger-info").textContent = `Balance available for passenger: ${result}`;
            });
        });

        // purchases an insurance
        DOM.elid('submit-purchase').addEventListener('click', () => {
            const airline = DOM.elid("airline-select").value;
            const passenger = DOM.elid("passenger-select").value;
            const index = DOM.elid('flight-select').value;
            const flight = flights[index];
            console.log(`flight: ${flight.timestamp}`);     
            contract.purchaseInsurance(passenger, airline, flight.flight, flight.timestamp, (error, result) => {
                if (error) DOM.elid("passenger-info").textContent = error;
                if (result) DOM.elid("passenger-info").textContent = `Insurance for flight: ${flight.flight} was purchased`;
            });
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        });
    });
})();

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}







