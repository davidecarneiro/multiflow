import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import '../App.css';

function Logs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetching all the logs list
    useEffect(() => {
        fetchLogs();
    }, []);

    // Endpoint to fetch all logs
    const fetchLogs = async () => {
        try {
            const response = await axios.get('http://localhost:3001/logs');
            setLogs(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setLoading(false);
        }
    };

    // Function to handle search button and search query
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Endpoint to search for logs based on the search query
    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/logs/search?query=${searchQuery}`);
            setLogs(response.data);
        } catch (error) {
            console.error('Error searching logs:', error);
        }
    };

    // Function to handle Enter key press event to execute the search function
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    if (loading) {
        return <div className='container col-12'><div className='panel-content mt-2'><h1 className='page-title'>Loading logs...</h1></div></div>;
    }

    return (
        <div className='container-fluid'>
            {/* Page header (title) */}
            <div className='page-header mt-2 d-flex justify-content-between align-items-center'>
                <h1 className='page-title'>Logs</h1>
            </div>

            {/* Search Bar */}
            <div className='panel-content mt-2'>
                <div className='col-6 mb-2'>
                    <div className="form-group d-flex justify-content-between align-items-center">
                        <label htmlFor="search" className="sr-only">Search</label>
                        <input type="text" className="form-control" name="search" id="search" placeholder="Search the logs" value={searchQuery} onChange={handleSearchChange} onKeyPress={handleKeyPress} />
                        <button className='ms-2 btn btn-secondary' style={{ backgroundColor: '#E6E8E6', border: 'none' }} onClick={handleSearch}><span><FontAwesomeIcon icon={faSearch} className='me-2 ms-2' style={{ color: '#000' }} /></span></button>
                    </div>
                </div>
            </div>

            {/* Logs list */}
            <div className='panel-content mt-4'></div>
            {logs.length === 0 ? (
                <h4 className='mt-2'>There are no logs that match your search.</h4>
            ) : (
                <div className='panel-content mt-2' style={{ backgroundColor: '#E6E8E6', borderRadius: '8px', height: '60vh', overflowY: 'auto' }}>
                    <div className='container-fluid ps-4 pe-4 pt-3 pb-4'>
                        {logs.map(log => (
                            <div className="log-item" key={log._id}>
                                <span style={{ display: 'block', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{log.content}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Logs;
