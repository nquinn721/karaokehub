import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { FacebookService } from '../services/facebook.service';

@Controller('api/facebook')
export class FacebookController {
  private readonly logger = new Logger(FacebookController.name);

  constructor(private readonly facebookService: FacebookService) {}

  /**
   * Get Facebook login URL for user authentication
   */
  @Get('login-url')
  getFacebookLoginUrl(@Query('redirectUri') redirectUri: string) {
    const appId = process.env.FACEBOOK_APP_ID || '646464114624794';
    const permissions = [
      'email',
      'public_profile',
      'user_groups',
      'groups_access_member_info',
    ].join(',');

    const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${permissions}&response_type=code`;

    return {
      loginUrl,
      permissions: permissions.split(','),
      note: 'User will be redirected to Facebook to grant permissions',
    };
  }

  /**
   * Exchange Facebook code for user access token
   */
  @Post('exchange-token')
  async exchangeToken(@Body() body: { code: string; redirectUri: string }) {
    try {
      const { code, redirectUri } = body;
      const userAccessToken = await this.facebookService.exchangeCodeForUserToken(
        code,
        redirectUri,
      );

      return {
        success: true,
        accessToken: userAccessToken,
        message: 'Successfully authenticated with Facebook',
      };
    } catch (error) {
      this.logger.error('Token exchange failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user's Facebook groups
   */
  @Post('user-groups')
  async getUserGroups(@Body() body: { accessToken: string }) {
    try {
      const { accessToken } = body;
      const groups = await this.facebookService.getUserGroups(accessToken);

      return {
        success: true,
        groups,
        count: groups.length,
      };
    } catch (error) {
      this.logger.error('Failed to get user groups:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search for karaoke content in user's groups
   */
  @Post('search-karaoke')
  async searchKaraokeInGroups(@Body() body: { accessToken: string }) {
    try {
      const { accessToken } = body;
      const results = await this.facebookService.searchKaraokeInUserGroups(accessToken);

      return {
        success: true,
        results,
        groupsWithKaraoke: results.length,
        totalPosts: results.reduce((sum, group) => sum + group.posts.length, 0),
      };
    } catch (error) {
      this.logger.error('Failed to search karaoke content:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse a specific Facebook group for karaoke content (user must be member)
   */
  @Post('parse-group')
  async parseGroup(@Body() body: { groupId: string; accessToken: string; groupUrl?: string }) {
    try {
      const { groupId, accessToken, groupUrl } = body;

      // Get group events and posts
      const [events, posts] = await Promise.all([
        this.facebookService.getGroupEvents(groupId, accessToken),
        this.facebookService.getGroupPosts(groupId, accessToken),
      ]);

      // Filter for karaoke-related content
      const karaokeEvents = events.filter(
        (event) =>
          event.name?.toLowerCase().includes('karaoke') ||
          event.description?.toLowerCase().includes('karaoke'),
      );

      const karaokePosts = posts.filter((post) => post.message?.toLowerCase().includes('karaoke'));

      // Convert to karaoke data format
      const karaokeShows = [];
      const karaokeDJs = [];

      // Process events
      for (const event of karaokeEvents) {
        const karaokeData = this.facebookService.convertToKaraokeData(
          event,
          groupUrl || `https://facebook.com/groups/${groupId}`,
        );
        karaokeShows.push(...karaokeData.shows);
        karaokeDJs.push(...karaokeData.djs);
      }

      return {
        success: true,
        groupId,
        shows: karaokeShows,
        djs: karaokeDJs,
        events: karaokeEvents,
        posts: karaokePosts,
        summary: {
          totalEvents: events.length,
          karaokeEvents: karaokeEvents.length,
          totalPosts: posts.length,
          karaokePosts: karaokePosts.length,
          showsFound: karaokeShows.length,
          djsFound: karaokeDJs.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse group:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
