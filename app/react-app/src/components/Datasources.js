import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faChevronRight, faPlus, faSearch, faFolderPlus, faDatabase } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

function DataSources() {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDataSource, setExpandedDataSource] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Get all data sources
  useEffect(() => {
    fetchDataSources();
  }, []);

  // Endpoint to get all data sources
  const fetchDataSources = async () => {
    try {
      const response = await axios.get('http://localhost:3001/dataSources');
      setDataSources(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      setLoading(false);
    }
  };

  // Function to expand and collapse the Data Source item
  const toggleDataSourceDescription = (dataSourceId) => {
    setExpandedDataSource(expandedDataSource === dataSourceId ? null : dataSourceId);
  };

  // Function to handle search button and search query
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Endpoint to search for data sources based on the search query
  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/dataSources/search?query=${searchQuery}`);
      setDataSources(response.data);
    } catch (error) {
      console.error('Error searching data sources:', error);
    }
  };

  // Function to make Enter key to execute the search function
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Function to handle click event of "Add DataSource" button
  const handleAddDataSourceClick = () => {
    navigate('/add-data-source'); // Navigate to add data source page
  };

  // Function to parse date into hh:mm dd/mm/yyyy
  const formatDate = (dateString) => {
    const date = new Date(dateString);

    // Format hours and minutes with leading zeros
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Format day, month, and year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  return (
    <div className='container-fluid'>
      {/* Page header (title and btn) */}
      <div className='page-header mt-2 d-flex justify-content-between align-items-center'>
        <h1 className='page-title'>Data Sources</h1>
        <button className="btn btn-primary" onClick={handleAddDataSourceClick}>
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          <span>Add Data Source</span>
        </button>
      </div>
      <div className='panel-content mt-2'>
        {/* Search bar */}
        <div className='col-6'>
          <div className="form-group d-flex justify-content-between align-items-center">
            <label htmlFor="search" className="sr-only">Search</label>
            <input type="text" className="form-control" name="search" id="search" placeholder="Search for data sources" value={searchQuery} onChange={handleSearchChange} onKeyPress={handleKeyPress} />
            <button className='ms-2 btn btn-secondary' style={{ backgroundColor: '#E6E8E6', border: 'none' }} onClick={handleSearch}><span><FontAwesomeIcon icon={faSearch} className='me-2 ms-2' style={{ color: '#000' }} /></span></button>
          </div>
        </div>

        {/* Data Sources list */}
        {loading ? (
          <h4>Loading data sources...</h4>
        ) : (
          <div className='col-12 mt-4'>
            {dataSources.length === 0 ? (
              <h4>There are no data sources that match your search.</h4>
            ) : (
              <ul className="list-group">
                {dataSources.map(dataSource => (
                  <li key={dataSource._id} className="list-group-item mt-1 mb-1" style={{ backgroundColor: '#e6e8e6', borderRadius: '8px' }}>
                    <div className='row align-items-center'>
                      <div className="col-md-9">
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon onClick={() => toggleDataSourceDescription(dataSource._id)} style={{ cursor: 'pointer' }} icon={expandedDataSource === dataSource._id ? faChevronDown : faChevronRight} className="me-2" />
                          <span
                            className='ms-2'
                            onClick={() => navigate(`/dataSources/${dataSource._id}`)}
                            style={{ cursor: 'pointer', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                            {dataSource.name}
                          </span>
                          {/* Data Source details such as 'type' and 'created at' */}
                          <label className='ms-4 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faDatabase} /><span className='ms-1'>Type: {dataSource.dataSourceType}</span></label>
                          <label className='ms-3 tiny-label' style={{ fontSize: '10px', color: 'gray' }}><FontAwesomeIcon icon={faFolderPlus} /><span className='ms-1'>Created at: </span> {formatDate(dataSource.dateCreated)}</label>
                        </div>
                      </div>
                    </div>
                    {expandedDataSource === dataSource._id && (
                      <p className="mt-2 mb-1">{dataSource.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataSources;
