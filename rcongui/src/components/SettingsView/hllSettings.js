import React from "react"
import {
  Grid, Typography, Button
} from "@material-ui/core"
import { range } from "lodash/util"
import { showResponse, postData, get, handle_http_errors, sendAction } from '../../utils/fetchUtils'
import { toast } from "react-toastify"
import VipEditableList from "./vips"
import AdminsEditableList from "./admins"
import _ from 'lodash'
import MapRotationTransferList from "./mapRotation"
import CollapseCard from '../collapseCard'
import ServerMessage from './serverMessage'
import NumSlider from './numSlider'
import ChangeMap from './changeMap'
import Padlock from './padlock'
import AutoRefreshLine from '../autoRefreshLine'



function valuetext(value) {
  return `${value}`;
}


class HLLSettings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      autoBalanceThres: 0,
      teamSwitchCooldownMin: 0,
      idleAutokickMin: 0,
      maxPingMs: 0,
      queueLength: 0,
      vipSlots: 0,
      mapRotation: [],
      availableMaps: [],
      vips: [],
      admins: [],
      adminRoles: ["owner", "senior", "junior"],
      welcomeMessage: "",
      broadcastMessage: "",
      lockedSliders: true
    };

    this.loadVips = this.loadVips.bind(this)
    this.loadAdmins = this.loadAdmins.bind(this)
    this.loadAdminRoles = this.loadAdminRoles.bind(this)
    this.loadMapRotation = this.loadMapRotation.bind(this)
    this.loadSettings = this.loadSettings.bind(this)
    this.saveSetting = this.saveSetting.bind(this)
    this.addMapsToRotation = this.addMapsToRotation.bind(this)
    this.removeMapsFromRotation = this.removeMapsFromRotation.bind(this)
    this.changeMap = this.changeMap.bind(this)
    this.toggleLockSliders = this.toggleLockSliders.bind(this)
  }

  componentDidMount() {
    this.loadMapRotation().then(this.loadAllMaps())
    this.loadSettings().then(this.loadAdminRoles)
  }

  toggleLockSliders() {
    this.setState({lockedSliders: !this.state.lockedSliders})
  }

  async loadSettings() {
    return get(`get_server_settings`)
      .then((res) => showResponse(res, "get_server_settings", false))
      .then(data => data.failed === false ? this.setState({
        autoBalanceThres: data.result.autobalance_threshold,
        teamSwitchCooldownMin: data.result.team_switch_cooldown,
        idleAutokickMin: data.result.idle_autokick_time,
        maxPingMs: data.result.max_ping_autokick,
        queueLength: data.result.queue_length,
        vipSlots: data.result.vip_slots_num,
      }) : null)
      .catch(handle_http_errors)
  }

  async _loadToState(command, showSuccess, stateSetter) {
    return get(command)
      .then((res) => showResponse(res, command, showSuccess))
      .then(res => res.failed === false ? stateSetter(res) : null)
      .catch(handle_http_errors)
  }

  async loadVips() {
    return this._loadToState("get_vip_ids", false, data => this.setState({ vips: data.result }))
  }

  async loadAdminRoles() {
    return this._loadToState("get_admin_groups", false, data => this.setState({ adminRoles: data.result }))
  }

  async loadAdmins() {
    return this._loadToState("get_admin_ids", false, data => this.setState({ admins: data.result }))
  }

  async loadMapRotation() {
    return this._loadToState("get_map_rotation", false, data => this.setState({ mapRotation: data.result }))
  }

  async loadAllMaps() {
    return this._loadToState("get_maps", false, data => this.setState({ availableMaps: data.result }))
  }

  async saveSetting(name, value) {
    return postData(`${process.env.REACT_APP_API_URL}do_save_setting`, { "name": name, "value": value }).then(
      (res) => showResponse(res, `do_save_setting ${name} ${value}`, true)
    ).catch(handle_http_errors)
  }

  async addMapsToRotation(maps) {
    return sendAction("do_add_maps_to_rotation", { maps: maps }).then(this.loadMapRotation)
  }

  async removeMapsFromRotation(maps) {
    return sendAction("do_remove_maps_from_rotation", { maps: maps }).then(this.loadMapRotation)
  }

  async changeMap(map_name) {
    return postData(`${process.env.REACT_APP_API_URL}set_map`, { map_name: map_name }).then(
      (res) => showResponse(res, `command: ${map_name}`, true)
    ).catch(handle_http_errors)
  }

  render() {
    const {
      autoBalanceThres,
      teamSwitchCooldownMin,
      idleAutokickMin,
      maxPingMs,
      queueLength,
      vipSlots,
      vips,
      admins,
      adminRoles,
      mapRotation,
      availableMaps,
      welcomeMessage,
      broadcastMessage,
      lockedSliders
    } = this.state;
    const { classes } = this.props;

    return (
      <Grid container spacing={3} className={classes.paper}>
        <Grid item xs={12}>
          <h2>HLL Game Server settings </h2>
          <small>(1min autorefresh)</small>
          <AutoRefreshLine intervalFunction={() => this.loadSettings().then(this.loadMapRotation)} execEveryMs={60000}
            statusRefreshIntervalMs={500} classes={classes} />
        </Grid>
        <Grid container xs={12} className={classes.paddingBottom} justify="center">
          <Grid item xs={12}>
            <ChangeMap classes={classes} availableMaps={availableMaps} changeMap={this.changeMap} />
          </Grid>
        </Grid>
        <Grid item className={classes.paper} sm={6} xs={12}>
          <ServerMessage
            autocompleteKey="welcome"
            type="Welcome message"
            classes={classes}
            value={welcomeMessage}
            setValue={(val) => this.setState({ welcomeMessage: val })}
            onSave={(val) => this.setState({ welcomeMessage: val }, () => sendAction("set_welcome_message", { msg: val }))}
          />
        </Grid>
        <Grid item className={classes.paper} sm={6} xs={12}>
          <ServerMessage
            autocompleteKey="broadcast"
            type="Broadcast message"
            classes={classes}
            value={broadcastMessage}
            setValue={(val) => this.setState({ broadcastMessage: val })}
            onSave={(val) => this.setState({ broadcastMessage: val }, () => sendAction("set_broadcast", { msg: val }))}
          />
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <CollapseCard title="Manage VIPs" classes={classes} onExpand={this.loadVips}>
            <p>Changes are applied immediately</p>
            <VipEditableList peopleList={vips} classes={classes}
              onAdd={
                (name, steamID64) => (
                  sendAction("do_add_vip", { "steam_id_64": steamID64, "name": name }).then(this.loadVips)
                )
              }
              onDelete={
                (name, steamID64) => (
                  sendAction("do_remove_vip", { "steam_id_64": steamID64 }).then(this.loadVips)
                )
              }
            />
          </CollapseCard>
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <CollapseCard title="Manage Console admins" classes={classes} onExpand={this.loadAdmins}>
            <p>Changes are applied immediately</p>
            <AdminsEditableList peopleList={admins} roles={adminRoles} classes={classes}
              onAdd={
                (name, steamID64, role) => (
                  sendAction("do_add_admin", { "steam_id_64": steamID64, "name": name, "role": role }).then(this.loadAdmins)
                )
              }
              onDelete={
                (name, steamID64, role) => (
                  sendAction("do_remove_admin", { "steam_id_64": steamID64 }).then(this.loadAdmins)
                )
              }
            />
          </CollapseCard>
        </Grid>
        <Grid container className={classes.paper} xs={12} alignContent="center" justify="center">
          <Grid item>
            <Padlock checked={lockedSliders} handleChange={this.toggleLockSliders} classes={classes} label="Locked sliders" />
          </Grid>   
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <NumSlider
            classes={classes}
            disabled={lockedSliders}
            text="Teamswitch cooldown (minutes)"
            max={30}
            value={teamSwitchCooldownMin}
            marks={range(0, 31, 5).map(val => ({
              value: val,
              label: `${val}`
            }))}
            helpText="0 to disable"
            getAriaValueText={valuetext}
            setValue={val => this.setState({ teamSwitchCooldownMin: val })}
            saveValue={val => this.setState({ teamSwitchCooldownMin: val }, () => this.saveSetting("team_switch_cooldown", val))}
          />
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <NumSlider
            classes={classes}
            disabled={lockedSliders}
            text="Autobalance threshold"
            max={50}
            value={autoBalanceThres}
            marks={range(0, 60, 10).map(val => ({
              value: val,
              label: `${val}`
            }))}
            helpText="0 means the teams must match exactly"
            setValue={val => this.setState({ autoBalanceThres: val })}
            saveValue={val => this.setState({ autoBalanceThres: val }, () => this.saveSetting("autobalance_threshold", val))}
          />
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <NumSlider
            classes={classes}
            disabled={lockedSliders}
            text="Idle autokick (minutes)"
            max={200}
            step={5}
            helpText="0 to disable"
            marks={range(0, 200, 20).map(val => ({
              value: val,
              label: `${val}`
            }))}
            value={idleAutokickMin == 9999 ? 0 : idleAutokickMin}
            setValue={val => this.setState({ idleAutokickMin: val })}
            saveValue={val => this.setState({ idleAutokickMin: val }, () => this.saveSetting("idle_autokick_time", val == 0 ? 9999 : val))}
          />
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <NumSlider
            classes={classes}
            disabled={lockedSliders}
            text="Maximum ping (ms)"
            helpText="0 to disable"
            max={2000}
            min={0}
            step={10}
            value={maxPingMs}
            marks={range(0, 2500, 500).map(val => ({
              value: val,
              label: `${val}`
            }))}
            setValue={val => this.setState({ maxPingMs: val })}
            saveValue={val => this.setState({ maxPingMs: val }, () => this.saveSetting("max_ping_autokick", val))}
          />
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <NumSlider
            classes={classes}
            disabled={lockedSliders}
            text="Max queue length"
            helpText="Maximum # of people waiting"
            max={6}
            min={1}
            value={queueLength}
            marks={range(0, 7, 1).map(val => ({ value: val, label: `${val}` }))}
            setValue={val => this.setState({ queueLength: val })}
            saveValue={val => this.setState({ queueLength: val }, () => this.saveSetting("queue_length", val))}
          />
        </Grid>
        <Grid item className={classes.paper} xs={12} md={6}>
          <NumSlider
            classes={classes}
            disabled={lockedSliders}
            text="Vip slots"
            helpText="# slots reserved"
            max={100}
            value={vipSlots}
            marks={range(0, 120, 20).map(val => ({
              value: val,
              label: `${val}`
            }))}
            setValue={val => this.setState({ vipSlots: val })}
            saveValue={val => this.setState({ vipSlots: val }, () => this.saveSetting("vip_slots_num", val))}
          />
        </Grid>
        <Grid container xs={12} className={classes.paddingBottom}>
          <Grid item xs={12}>
            <Typography variant="caption" display="block" gutterBottom>Due to the HLL server limitations we can't know if the autobalance is on or off</Typography>
          </Grid>
          <Grid item xs={6}><Button fullWidth variant="outlined" onClick={() => sendAction("set_autobalance", { bool_str: "on" })}>Activate autobalance</Button></Grid>
          <Grid item xs={6}><Button fullWidth variant="outlined" onClick={() => sendAction("set_autobalance", { bool_str: "off" })}>Deactivate autobalance</Button></Grid>
        </Grid>
        <Grid container className={classes.paddingTop} justify="center" xs={12}>
          <Grid item>
            <Typography variant="h5" gutterBottom>
              Configure map rotation
            </Typography>
          </Grid>
        </Grid>
        <Grid container className={classes.paper} xs={12}>
          <MapRotationTransferList
            classes={classes}
            mapRotation={mapRotation}
            availableMaps={_.difference(availableMaps, mapRotation)}
            addToRotation={this.addMapsToRotation}
            removeFromRotation={this.removeMapsFromRotation}
          />
        </Grid>
        <Grid container className={classes.paper} justify="center" xs={12}>
          <Grid item xs={5} className={classes.padding}>
            <Button variant="outlined" fullWidth onClick={() => sendAction('do_randomize_map_rotation', {}).then(this.loadMapRotation)}>Randomize all</Button>
          </Grid>
          <Grid item xs={5} className={classes.padding}>
            <Button variant="outlined" fullWidth onClick={() => sendAction('do_randomize_map_rotation', { maps: mapRotation }).then(this.loadMapRotation)}>Randomize current</Button>
          </Grid>
        </Grid>
      </Grid>
    );
  }
}

export default HLLSettings;
