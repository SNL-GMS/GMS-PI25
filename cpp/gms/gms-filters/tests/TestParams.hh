
class TestParams
{
    FILTER_DEFINITION filterDef;

public:
    FILTER_DEFINITION *filter_definition;
    double *data;
    int num_data;
    int sample_rate;
    int counter;
    TestParams()
    {
        this->sample_rate = 40;
        this->num_data = 2 * 60 * 60 * this->sample_rate;

        // generate an IAN data vector with random data samples
        this->data = (double *)malloc(sizeof(double) * this->num_data);
        for (this->counter = 0; this->counter < this->num_data; ++this->counter)
        {
            this->data[this->counter] = (((double)rand() / (RAND_MAX)) - 0.5) * 2 * 10;
        }

        this->filterDef.is_designed = 0;
        this->filterDef.remove_group_delay = 0;
        this->filterDef.num_filter_descriptions = 3;
        this->filterDef.filter_sequence_description[0].filter_type = IIR;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.design_model = BUTTERWORTH;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.band_type = BAND_PASS;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.cutoff_frequency_low = 3;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.cutoff_frequency_high = 15;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.filter_order = 3;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.sample_rate = this->sample_rate;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.zero_phase = 1;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.taper = 20;
        this->filterDef.filter_sequence_description[0].linear_iir_filter_description.iir_filter_parameters.is_designed = 0;
        this->filterDef.filter_sequence_description[1].filter_type = IIR;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.design_model = BUTTERWORTH;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.band_type = BAND_REJECT;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.cutoff_frequency_low = 5;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.cutoff_frequency_high = 6;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.filter_order = 5;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.sample_rate = this->sample_rate;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.zero_phase = 0;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.taper = 0;
        this->filterDef.filter_sequence_description[1].linear_iir_filter_description.iir_filter_parameters.is_designed = 0;
        this->filterDef.filter_sequence_description[2].filter_type = IIR;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.design_model = BUTTERWORTH;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.band_type = BAND_REJECT;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.cutoff_frequency_low = 11;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.cutoff_frequency_high = 13;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.filter_order = 7;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.sample_rate = this->sample_rate;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.zero_phase = 0;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.taper = 0;
        this->filterDef.filter_sequence_description[2].linear_iir_filter_description.iir_filter_parameters.is_designed = 0;
        this->filter_definition = &filterDef;
    };
};