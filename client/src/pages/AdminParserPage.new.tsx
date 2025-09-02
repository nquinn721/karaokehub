import { faPlay, faSearch, faSignInAlt, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Box, Button, Paper, Tab, Tabs, TextField, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { parserStore } from '../stores';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`parser-tabpanel-${index}`}
      aria-labelledby={`parser-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminParserPage: React.FC = observer(() => {
  const [inputUrl, setInputUrl] = React.useState('');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    console.log('🔥 Tab changed to:', newValue);
    parserStore.setParsingTabValue(newValue);
  };

  const handleAddUrlToQueue = () => {
    if (inputUrl.trim()) {
      console.log('Adding URL:', inputUrl);
      setInputUrl('');
    }
  };

  const handleStartDiscovery = () => {
    console.log('Starting Facebook discovery');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        🚀 Admin Parser - Website Parsing & Facebook Groups
      </Typography>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={parserStore.parsingTabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="parser tabs"
          >
            <Tab
              icon={<FontAwesomeIcon icon={faPlay} />}
              label="Parse Website"
              id="parser-tab-0"
              aria-controls="parser-tabpanel-0"
            />
            <Tab
              icon={<FontAwesomeIcon icon={faUsers} />}
              label="Facebook Groups"
              id="parser-tab-1"
              aria-controls="parser-tabpanel-1"
            />
          </Tabs>
        </Box>

        <TabPanel value={parserStore.parsingTabValue} index={0}>
          <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
            🎯 Parse Website Tab
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <TextField
                label="Enter URL to add to queue"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                fullWidth
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrlToQueue();
                  }
                }}
              />
              <Button variant="contained" onClick={handleAddUrlToQueue} disabled={!inputUrl.trim()}>
                Add URL
              </Button>
            </Box>
          </Box>

          <Typography>
            This is where the URL parsing functionality will be. You can now add URLs and parse
            websites here. This content is shown when "Parse Website" tab is selected.
          </Typography>
        </TabPanel>

        <TabPanel value={parserStore.parsingTabValue} index={1}>
          <Typography variant="h5" color="secondary" sx={{ mb: 2 }}>
            👥 Facebook Groups Tab
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Important:</strong> This process requires Facebook authentication and may take
            several hours to complete. Make sure you have proper Facebook credentials configured
            before starting.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartDiscovery}
              startIcon={<FontAwesomeIcon icon={faSearch} />}
            >
              Start Facebook Group Discovery
            </Button>

            <Button variant="outlined" startIcon={<FontAwesomeIcon icon={faSignInAlt} />}>
              Facebook Login
            </Button>
          </Box>

          <Typography>
            This is where the Facebook Group Discovery functionality will be. You can discover
            karaoke groups here. This content is shown when "Facebook Groups" tab is selected.
          </Typography>
        </TabPanel>
      </Paper>
    </Box>
  );
});

export default AdminParserPage;
