import { faChevronRight, faHome } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  icon: any;
  path?: string;
  isActive?: boolean;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
}

const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator={<FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '12px' }} />}
        sx={{ color: 'text.secondary' }}
      >
        {/* Always include Dashboard as first item */}
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <FontAwesomeIcon icon={faHome} style={{ marginRight: '4px', fontSize: '14px' }} />
          Dashboard
        </Link>

        {/* Render provided items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          if (isLast || item.isActive) {
            return (
              <Typography
                key={index}
                color="primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 500,
                }}
              >
                <FontAwesomeIcon
                  icon={item.icon}
                  style={{ marginRight: '4px', fontSize: '14px' }}
                />
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              underline="hover"
              color="inherit"
              onClick={() => item.path && navigate(item.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <FontAwesomeIcon icon={item.icon} style={{ marginRight: '4px', fontSize: '14px' }} />
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default AdminBreadcrumb;
